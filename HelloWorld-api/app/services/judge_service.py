"""评测服务 - 代码提交评测

负责接收用户提交的代码，进行编译/运行、测试用例验证、得分计算、
星级评定、进度更新、知识掌握度更新以及错题记录等功能。
支持 Python、JavaScript、TypeScript、C、C++、Java 六种语言。
"""

import asyncio, json, subprocess, tempfile, os, logging, shutil
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.submission import Submission
from app.models.progress import Progress
from app.models.user import User
from app.models.enums import SubmissionStatus, ProgressStatus
from app.config import settings
from app.judge.language_config import LANGUAGE_COMMANDS, LANGUAGE_EXTENSIONS
from app.services.knowledge_service import update_knowledge
from app.services.error_service import save_error

logger = logging.getLogger(__name__)

# 并发控制：最多同时运行 10 个评测任务
_judge_semaphore = asyncio.Semaphore(10)

# 测试用例包装模板：各语言通过 print/printf/cout 输出表达式结果
WRAPPER_TEMPLATES = {
    "python": "\n\n# ---- test harness ----\nprint({expr})\n",
    "javascript": "\n\n// ---- test harness ----\nconsole.log({expr});\n",
    "typescript": "\n\n// ---- test harness ----\nconsole.log({expr});\n",
    "c": '\n\n/* ---- test harness ---- */\n#include <stdio.h>\n#include <string.h>\n\nint main() {{\n    printf("{fmt}\\n", {expr});\n    return 0;\n}}\n',
    "cpp": '\n\n// ---- test harness ----\n#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {{\n    auto __result = {expr};\n    cout << __result << endl;\n    return 0;\n}}\n',
    "java": '\n\n// ---- test harness ----\nclass Main {{ public static void main(String[] args) {{ System.out.println({expr}); }} }}\n',
}



class JudgeService:
    """代码评测服务，处理代码提交、执行和评分"""

    def __init__(self, db: AsyncSession):
        """初始化评测服务

        Args:
            db: 数据库会话实例
        """
        self.db = db

    def _safe_decode(self, data):
        """安全解码 subprocess 输出，兼容 Windows GBK

        Args:
            data: 二进制输出数据

        Returns:
            解码后的字符串
        """
        if data is None:
            return ""
        if isinstance(data, str):
            return data
        # 依次尝试多种编码，保证跨平台兼容
        for enc in ["utf-8", "gbk", "cp936", "latin-1"]:
            try:
                return data.decode(enc)
            except (UnicodeDecodeError, LookupError):
                continue
        return data.decode("utf-8", errors="replace")

    def _safe_run(self, cmd, timeout=10, **kwargs):
        """安全执行命令，二进制模式避免 GBK 崩溃

        Args:
            cmd: 命令列表
            timeout: 超时时间（秒）
            **kwargs: 传递给 subprocess.run 的额外参数

        Returns:
            包含 stdout、stderr、returncode 的字典
        """
        proc = subprocess.run(cmd, capture_output=True, timeout=timeout, **kwargs)
        return {
            "stdout": self._safe_decode(proc.stdout),
            "stderr": self._safe_decode(proc.stderr),
            "returncode": proc.returncode,
        }

    async def submit_and_judge(self, user_id: int, lesson_id: int, code: str, language: str = "python") -> dict:
        """提交代码并执行评测（异步入口）

        流程：
        1. 查询课时是否存在
        2. 创建提交记录（状态为 pending）
        3. 通过信号量控制并发，同步执行评测
        4. 更新提交状态和分数
        5. 更新用户进度
        6. 更新知识掌握度
        7. 保存错题记录
        8. 更新用户连续打卡、经验值和等级
        9. 生成鼓励消息和星级评分

        Args:
            user_id: 用户 ID
            lesson_id: 课时 ID
            code: 用户提交的代码
            language: 编程语言（默认 python）

        Returns:
            包含状态、分数、星级、输出、测试结果等信息的字典
        """
        from app.models.lesson import Lesson
        # 查询课时
        result = await self.db.execute(select(Lesson).where(Lesson.id == lesson_id))
        lesson = result.scalars().first()
        if not lesson:
            return {"status": "error", "score": 0, "stdout": "", "stderr": "课时不存在", "execution_time": 0, "test_results": [], "xp_earned": 0}

        # 创建提交记录
        submission = Submission(user_id=user_id, lesson_id=lesson_id, code=code, language=language, status=SubmissionStatus.pending)
        self.db.add(submission)
        await self.db.flush()

        # 并发控制下执行评测
        async with _judge_semaphore:
            judge_result = await asyncio.to_thread(self._run_and_judge_sync, code, language, lesson)

        # 更新提交记录
        submission.status = judge_result["status"]
        submission.stdout = judge_result.get("stdout", "")
        submission.stderr = judge_result.get("stderr", "")
        submission.score = judge_result.get("score", 0)
        submission.execution_time = judge_result.get("execution_time", 0)

        # 更新用户进度
        await self._update_progress(user_id, lesson_id, judge_result, code, lesson)

        score = judge_result.get("score", 0)

        # 更新知识掌握度（支持六种语言，只要关卡有 knowledge_tags）
        if language in ("python", "javascript", "java", "c", "cpp", "typescript"):
            tags = getattr(lesson, 'knowledge_tags', None)
            if tags:
                try:
                    await update_knowledge(self.db, user_id, tags, score, score >= 80)
                except Exception:
                    logger.exception("知识掌握度更新失败")

        # 错题记录（score < 100 时保存错误）
        if score < 100:
            try:
                await save_error(
                    self.db, user_id, lesson_id, code,
                    stderr=judge_result.get("stderr", ""),
                    score=score,
                    test_results=judge_result.get("test_results"),
                )
            except Exception:
                logger.exception("错题记录保存失败")
        xp_earned = 0

        # 更新用户统计（连续打卡、XP、等级）
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if user:
            # 计算连续打卡天数
            today = datetime.now(timezone.utc).date()
            last = user.last_login_at.date() if user.last_login_at else None
            if last is None:
                user.streak_days = 1
            elif last == today:
                if (user.streak_days or 0) == 0:
                    user.streak_days = 1
            elif last == today - timedelta(days=1):
                user.streak_days = (user.streak_days or 0) + 1
            else:
                user.streak_days = 1
            user.last_login_at = datetime.now(timezone.utc)

            # 计算 XP 和经验等级
            if score > 0:
                xp_earned = max(1, int((score / 100) * (lesson.xp_reward or 10)))
                user.xp = (user.xp or 0) + xp_earned
                user.level = max(1, (user.xp or 0) // 100 + 1)

        # 根据得分生成鼓励消息
        if score == 100:
            encouragement = "完美通关！所有测试用例通过！"
        elif score >= 80:
            encouragement = f"非常接近！已通过 {score}% 的测试用例，再调整一下就能通关！"
        elif score >= 50:
            encouragement = f"进展不错！已通过 {score}% 的测试用例，继续努力！"
        elif score > 0:
            encouragement = f"好的开始！已通过 {score}% 的测试用例，看看哪里还需要调整。"
        else:
            encouragement = "代码有错误，请检查错误信息并修正后重试。"

        # 丰富测试结果：补充 error_type 字段
        enriched_test_results = []
        for tr in judge_result.get("test_results", []):
            if tr.get("status") == "error" and "error_type" not in tr:
                tr["error_type"] = "runtime"
            elif tr.get("status") == "failed" and "error_type" not in tr:
                tr["error_type"] = "logic"
            enriched_test_results.append(tr)

        # 星级评分规则：0→0★, 1-49→1★, 50-79→2★, 80-99→3★, 100→4★, 满分+快速→5★
        stars = 0
        if score == 100:
            exec_time = judge_result.get("execution_time", 999)
            stars = 5 if exec_time < 500 else 4
        elif score >= 80:
            stars = 3
        elif score >= 50:
            stars = 2
        elif score > 0:
            stars = 1

        return {
            "status": judge_result["status"],
            "score": score,
            "stars": stars,
            "stdout": judge_result.get("stdout") or "",
            "stderr": judge_result.get("stderr") or "",
            "execution_time": judge_result.get("execution_time", 0),
            "test_results": enriched_test_results,
            "xp_earned": xp_earned,
            "encouragement_message": encouragement,
            "error_type": judge_result.get("error_type", ""),
            "ai_analysis": "",
        }

    def _run_and_judge_sync(self, code: str, language: str, lesson) -> dict:
        """同步执行评测逻辑：逐条运行测试用例并比对结果

        Args:
            code: 用户代码
            language: 编程语言
            lesson: 课时对象（包含 test_cases）

        Returns:
            包含状态、分数、测试结果等信息的字典
        """
        # 解析测试用例
        test_cases = lesson.test_cases
        if isinstance(test_cases, str):
            test_cases = json.loads(test_cases)

        ext = LANGUAGE_EXTENSIONS.get(language, ".txt")

        # 无测试用例时仅做语法检查
        if not test_cases:
            syntax_check = self._execute_code(code, ext, language)
            if syntax_check["status"] != SubmissionStatus.accepted:
                return {"status": syntax_check["status"], "score": 0, "stdout": syntax_check["stdout"], "stderr": syntax_check["stderr"], "execution_time": syntax_check["execution_time"], "test_results": [], "error_type": "syntax"}
            return {"status": SubmissionStatus.accepted, "score": 100, "stdout": syntax_check["stdout"], "stderr": syntax_check["stderr"], "execution_time": syntax_check["execution_time"], "test_results": []}

        wrapper_template = WRAPPER_TEMPLATES.get(language, WRAPPER_TEMPLATES["python"])
        total_time = 0
        test_results = []
        passed_count = 0

        # 逐条执行测试用例
        for i, tc in enumerate(test_cases):
            expr = tc.get("input", "").strip()
            expected = tc.get("expected_output", "").strip()
            description = tc.get("description", f"测试用例 {i+1}")

            # 拼接代码 + 测试包装
            if expr:
                # C 语言根据期望输出类型选择 %d 或 %s
                if language == "c":
                    is_numeric = self._is_numeric(expected)
                    fmt = "%d" if is_numeric else "%s"
                    full_code = code + wrapper_template.format(expr=expr, fmt=fmt)
                elif language == "go":
                    full_code = wrapper_template.format(expr=expr, user_code=code)
                else:
                    # Python 等多语句场景：将 a=1; b=2; func(a,b) 拆为多行，最后 print
                    if language == "python" and ";" in expr:
                        parts = [p.strip() for p in expr.split(";") if p.strip()]
                        statements = "\n".join(parts[:-1])
                        last_expr = parts[-1]
                        # 多表达式（含逗号）需要套一层括号，确保 print 输出元组格式
                        harness = f"\n\n# ---- test harness ----\n{statements}\nprint(({last_expr}))\n"
                        full_code = code + harness
                    else:
                        full_code = code + wrapper_template.format(expr=expr)
            else:
                full_code = code

            # 执行代码
            result = self._execute_code(full_code, ext, language)
            total_time += result.get("execution_time", 0)

            # 超时则立即返回
            if result["status"] == SubmissionStatus.timeout:
                return {"status": SubmissionStatus.timeout, "score": 0, "stdout": "", "stderr": "执行超时", "execution_time": total_time, "test_results": test_results}

            stdout = result["stdout"].strip()
            stderr = result["stderr"].strip()

            # 智能比对实际输出与期望输出
            is_passed = self._smart_match(stdout, expected)

            # 运行时错误则立即返回
            if result["status"] == SubmissionStatus.error:
                test_results.append({"index": i + 1, "description": description, "status": "error", "expected": expected, "actual": stdout, "stderr": stderr, "error_type": "runtime"})
                return {"status": SubmissionStatus.error, "score": 0, "stdout": "", "stderr": stderr, "execution_time": total_time, "test_results": test_results}

            # 记录通过或失败的测试结果
            if is_passed:
                test_results.append({"index": i + 1, "description": description, "status": "passed", "expected": expected, "actual": stdout})
                passed_count += 1
            else:
                test_results.append({"index": i + 1, "description": description, "status": "failed", "expected": expected, "actual": stdout, "error_type": "logic"})

        # 计算最终得分和状态
        total = len(test_cases)
        score = int((passed_count / total) * 100) if total > 0 else 100
        if score == 100:
            status = SubmissionStatus.accepted
        elif score > 0:
            status = SubmissionStatus.wrong
        else:
            status = SubmissionStatus.error

        return {"status": status, "score": score, "stdout": "", "stderr": "", "execution_time": total_time, "test_results": test_results}

    def _is_numeric(self, s: str) -> bool:
        """判断字符串是否表示数值

        Args:
            s: 待判断字符串

        Returns:
            是否为数值
        """
        try:
            float(s)
            return True
        except (ValueError, TypeError):
            return False

    def _smart_match(self, actual: str, expected: str) -> bool:
        """智能比对实际输出与期望输出

        支持逐级降级的比对策略：
        1. 精确相等
        2. 清洗 numpy 类型前缀后相等
        3. 去除首尾空白后相等
        4. 不区分大小写
        5. 包含关系
        6. 浮点数近似相等（误差 < 0.0001）
        7. 去除所有空白后相等

        Args:
            actual: 实际输出
            expected: 期望输出

        Returns:
            是否匹配
        """
        if actual == expected:
            return True
        # 清洗 numpy 类型前缀 (如 np.float64(3.0) → 3.0)
        import re
        _clean = lambda s: re.sub(r'np\.\w+\(([^)]+)\)', r'\1', s)
        actual_clean = _clean(actual)
        expected_clean = _clean(expected)
        if actual_clean == expected_clean:
            return True
        if actual.strip() == expected.strip():
            return True
        if actual_clean.strip() == expected_clean.strip():
            return True
        if actual.lower() == expected.lower():
            return True
        if expected in actual or actual in expected:
            return True
        if expected_clean in actual_clean or actual_clean in expected_clean:
            return True
        try:
            af = float(actual_clean)
            ef = float(expected_clean)
            if abs(af - ef) < 0.0001:
                return True
        except (ValueError, TypeError):
            pass
        if "".join(actual.split()) == "".join(expected.split()):
            return True
        if "".join(actual_clean.split()) == "".join(expected_clean.split()):
            return True
        return False

    def _execute_code(self, code: str, ext: str, language: str) -> dict:
        """执行代码的统一入口

        Args:
            code: 代码内容
            ext: 文件扩展名
            language: 编程语言

        Returns:
            包含执行结果的字典
        """
        return self._execute_direct(code, ext, language)


    def _execute_direct(self, code: str, ext: str, language: str) -> dict:
        """直接执行代码（编译+运行）

        流程：
        1. 创建临时文件写入代码
        2. 如果需要编译（C/C++/Java/TypeScript），先执行编译命令
        3. 执行运行命令
        4. 清理临时文件

        Args:
            code: 代码内容
            ext: 文件扩展名
            language: 编程语言

        Returns:
            包含 status、stdout、stderr、execution_time 的字典
        """
        files_to_clean = []
        try:
            # Java 需要在独立目录中创建 Main.java
            if language == "java":
                work_dir = tempfile.mkdtemp(prefix="HelloWorld_java_")
                temp_path = os.path.join(work_dir, "Main.java")
                f = open(temp_path, "w", encoding="utf-8")
                files_to_clean.append(work_dir)
            else:
                f = tempfile.NamedTemporaryFile(mode="w", suffix=ext, delete=False, encoding="utf-8")
                temp_path = f.name
                work_dir = os.path.dirname(temp_path)
                files_to_clean.append(temp_path)
            with f:
                # Python 文件加上编码声明，避免 Windows GBK 问题
                if language == "python" and not code.startswith("# -*- coding:"):
                    f.write("# -*- coding: utf-8 -*-\n" + code)
                else:
                    f.write(code)

            # 获取编译和运行命令
            run_cmd, compile_cmd = LANGUAGE_COMMANDS.get(language, (["python", "{file}"], None))
            start_time = datetime.now()

            # 编译阶段
            if compile_cmd is not None:
                if language == "java":
                    with open(temp_path, "r", encoding="utf-8") as src:
                        content = src.read()
                    with open(temp_path, "w", encoding="utf-8") as dst:
                        dst.write(content.replace("public class", "class"))
                js_output = os.path.splitext(temp_path)[0] + ".js"
                compile_cmd = [c.replace("{file}", temp_path).replace("{output}", temp_path + ".out").replace("{dir}", work_dir).replace("{js_output}", js_output) for c in compile_cmd]
                proc = subprocess.run(compile_cmd, capture_output=True, timeout=10, cwd=work_dir)
                compile_time = (datetime.now() - start_time).total_seconds() * 1000
                # 编译失败则返回错误
                if proc.returncode != 0:
                    return {"status": SubmissionStatus.error, "stdout": "", "stderr": self._safe_decode(proc.stderr).strip() or self._safe_decode(proc.stdout).strip(), "execution_time": compile_time}
                out_path = temp_path + ".out"
                if os.path.exists(out_path):
                    files_to_clean.append(out_path)
                if language == "typescript" and os.path.exists(js_output):
                    files_to_clean.append(js_output)

            # 运行阶段
            class_name = "Main" if language == "java" else os.path.splitext(os.path.basename(temp_path))[0]
            js_output = os.path.splitext(temp_path)[0] + ".js"
            run_cmd = [c.replace("{file}", temp_path).replace("{output}", temp_path + ".out").replace("{dir}", work_dir).replace("{classname}", class_name).replace("{js_output}", js_output) for c in run_cmd]
            proc = subprocess.run(run_cmd, capture_output=True, timeout=10, cwd=work_dir)
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            if proc.returncode == 0:
                return {"status": SubmissionStatus.accepted, "stdout": self._safe_decode(proc.stdout), "stderr": self._safe_decode(proc.stderr), "execution_time": elapsed}
            else:
                return {"status": SubmissionStatus.error, "stdout": self._safe_decode(proc.stdout), "stderr": self._safe_decode(proc.stderr), "execution_time": elapsed}
        except subprocess.TimeoutExpired:
            return {"status": SubmissionStatus.timeout, "stdout": "", "stderr": "执行超时", "execution_time": 10000}
        except Exception as e:
            return {"status": SubmissionStatus.error, "stdout": "", "stderr": str(e), "execution_time": 0}
        finally:
            # 清理临时文件
            for fp in files_to_clean:
                try:
                    if os.path.isdir(fp):
                        shutil.rmtree(fp, ignore_errors=True)
                    elif os.path.exists(fp):
                        os.unlink(fp)
                except OSError:
                    pass

    async def _update_progress(self, user_id: int, lesson_id: int, judge_result: dict, code: str, lesson) -> Progress:
        """更新用户课时进度

        如果进度记录不存在则创建，更新尝试次数、最佳分数、最佳代码和完成状态。

        Args:
            user_id: 用户 ID
            lesson_id: 课时 ID
            judge_result: 评测结果字典
            code: 用户提交的代码
            lesson: 课时对象

        Returns:
            更新后的 Progress 对象
        """
        result = await self.db.execute(select(Progress).where(Progress.user_id == user_id, Progress.lesson_id == lesson_id))
        progress = result.scalars().first()
        if not progress:
            progress = Progress(user_id=user_id, lesson_id=lesson_id, status=ProgressStatus.in_progress, attempts=0)
            self.db.add(progress)
            await self.db.flush()
        progress.attempts = (progress.attempts or 0) + 1
        current_score = judge_result.get("score", 0)
        if current_score > (progress.best_score or 0):
            progress.best_score = current_score
            progress.best_code = code
        if judge_result["status"] == SubmissionStatus.accepted:
            progress.status = ProgressStatus.completed
            progress.completed_at = datetime.now(timezone.utc)
        else:
            progress.status = ProgressStatus.in_progress
        return progress
