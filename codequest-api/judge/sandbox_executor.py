"""Docker 沙箱代码执行器 - 在隔离容器中安全运行用户代码"""

import os
import subprocess
from datetime import datetime

from app.judge.language_config import SANDBOX_LANGUAGE_COMMANDS as LANGUAGE_COMMANDS, LANGUAGE_EXTENSIONS

SANDBOX_IMAGE = "codequest-sandbox"


def execute_in_sandbox(code: str, ext: str, language: str) -> dict:
    """在 Docker 沙箱中执行代码并返回结果"""
    import tempfile

    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=ext, delete=False, encoding="utf-8"
        ) as f:
            f.write(code)
            host_path = f.name

        try:
            run_cmd, compile_cmd = LANGUAGE_COMMANDS.get(
                language, (["python3", "/code/user_code.py"], None)
            )

            start_time = datetime.now()

            # Java: 去掉 public class 修饰符
            if language == "java":
                with open(host_path, "r", encoding="utf-8") as src:
                    content = src.read()
                content = content.replace("public class", "class")
                with open(host_path, "w", encoding="utf-8") as dst:
                    dst.write(content)

            # 构建 Docker 命令基础参数（仅挂载源文件只读，编译产物写入 tmpfs /tmp）
            docker_base = [
                "docker", "run", "--rm",
                "--network", "none",
                "--memory", "256m",
                "--cpus", "1",
                "--pids-limit", "64",
                "--read-only",
                "--tmpfs", "/tmp:exec,size=32m",
                "-v", f"{host_path}:/code/user_code{ext}:ro",
                SANDBOX_IMAGE,
            ]

            # 编译阶段
            if compile_cmd is not None:
                proc = subprocess.run(
                    docker_base + compile_cmd,
                    capture_output=True, encoding='utf-8', timeout=15,
                )
                compile_time = (datetime.now() - start_time).total_seconds() * 1000
                if proc.returncode != 0:
                    return {
                        "status": "error",
                        "stdout": "",
                        "stderr": proc.stderr.strip() or proc.stdout.strip(),
                        "execution_time": compile_time,
                    }

            # 执行阶段
            proc = subprocess.run(
                docker_base + run_cmd,
                capture_output=True, encoding='utf-8', timeout=5,
            )
            execution_time = (datetime.now() - start_time).total_seconds() * 1000

            if proc.returncode != 0:
                return {
                    "status": "error",
                    "stdout": proc.stdout.strip(),
                    "stderr": proc.stderr.strip(),
                    "execution_time": execution_time,
                }

            return {
                "status": "ok",
                "stdout": proc.stdout.strip(),
                "stderr": proc.stderr.strip(),
                "execution_time": execution_time,
            }
        except subprocess.TimeoutExpired:
            return {
                "status": "timeout",
                "stdout": "",
                "stderr": "执行超时",
                "execution_time": 5000,
            }
        finally:
            os.unlink(host_path)
    except Exception as e:
        return {
            "status": "error",
            "stdout": "",
            "stderr": str(e),
            "execution_time": 0,
        }
