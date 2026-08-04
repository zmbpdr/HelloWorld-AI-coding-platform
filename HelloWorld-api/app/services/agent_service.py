"""智能体工坊服务

提供 AI 智能体学习路线的完整功能，包括：
- 神经突触地图（节点和边的拓扑结构）
- 节点详情查询
- 代码提交与评测（含四维能量评分）
- 用户进度查询
- 路线概览

支持 8 条学习路线：机器学习、AI Agent、大模型、综合项目、深度学习、NLP、CV、强化学习。
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.agent import NeuronNode, AgentProgress
from app.models.user import User
from app.models.enums import SubmissionStatus
from datetime import datetime, timedelta, timezone
from app.services.judge_service import JudgeService

# 8 条学习路线的元信息
TRACK_INFO = {
    "ml": {"name": "机器学习基础", "description": "从数学基础到经典算法"},
    "agent": {"name": "AI Agent开发", "description": "从工具调用到多智能体协作"},
    "llm": {"name": "大模型应用", "description": "从Prompt工程到RAG架构"},
    "project": {"name": "综合项目", "description": "真实项目实战"},
    "dl": {"name": "深度学习", "description": "从神经网络到Transformer"},
    "nlp": {"name": "自然语言处理", "description": "从文本预处理到LLM微调"},
    "cv": {"name": "计算机视觉", "description": "从图像分类到目标检测"},
    "rl": {"name": "强化学习", "description": "从Q-Learning到PPO"},
}


class AgentService:
    """智能体工坊服务"""

    def __init__(self, db: AsyncSession):
        """初始化智能体工坊服务

        Args:
            db: 数据库会话实例
        """
        self.db = db

    async def get_neural_map(self, user_id: int) -> dict:
        """获取神经突触地图（所有节点和边的拓扑结构）

        查询所有激活的神经元节点及其用户进度，构建节点列表和边列表。

        Args:
            user_id: 用户 ID

        Returns:
            包含 nodes（节点列表）和 edges（边列表）的字典
        """
        result = await self.db.execute(
            select(NeuronNode).where(NeuronNode.is_active == True).order_by(NeuronNode.track, NeuronNode.order)
        )
        nodes = result.scalars().all()
        progress_result = await self.db.execute(select(AgentProgress).where(AgentProgress.user_id == user_id))
        progress_list = progress_result.scalars().all()
        progress_map = {p.node_id: p for p in progress_list}

        node_briefs = []
        edges = []
        for node in nodes:
            progress = progress_map.get(node.id)
            # 解析节点状态（locked/available/in_progress/completed/mastered）
            status = self._resolve_status(node, progress, progress_map)
            node_briefs.append({
                "id": node.id, "title": node.title, "slug": node.slug,
                "track": node.track, "section": node.section, "difficulty": node.difficulty,
                "order": node.order, "xp_reward": node.xp_reward,
                "prerequisites": node.prerequisites or [], "status": status,
                "energy_score": progress.energy_score if progress else None,
            })
            # 构建前置依赖边
            if node.prerequisites:
                for prereq_id in node.prerequisites:
                    edges.append({"source": prereq_id, "target": node.id})
        return {"nodes": node_briefs, "edges": edges}

    async def get_node_detail(self, node_id: int, user_id: int) -> dict:
        """获取节点详情（含用户进度）

        Args:
            node_id: 节点 ID
            user_id: 用户 ID

        Returns:
            节点详情字典，包含 content、starter_code、energy_levels 等；节点不存在时返回 None
        """
        result = await self.db.execute(select(NeuronNode).where(NeuronNode.id == node_id))
        node = result.scalars().first()
        if not node:
            return None
        progress_result = await self.db.execute(
            select(AgentProgress).where(AgentProgress.user_id == user_id, AgentProgress.node_id == node_id)
        )
        progress = progress_result.scalars().first()
        status = self._resolve_status(node, progress)
        return {
            "id": node.id, "title": node.title, "slug": node.slug,
            "description": node.description, "content": node.content,
            "order": node.order, "difficulty": node.difficulty,
            "xp_reward": node.xp_reward, "track": node.track, "section": node.section,
            "starter_code": node.starter_code, "hint": node.hint,
            "prerequisites": node.prerequisites or [],
            "energy_levels": node.energy_levels, "status": status,
            "energy_score": progress.energy_score if progress else None,
            "energy_detail": progress.energy_detail if progress else None,
            "best_code": progress.best_code if progress else None,
            "attempts": progress.attempts if progress else 0,
        }

    async def submit_and_judge(self, user_id: int, node_id: int, code: str) -> dict:
        """提交 Agent 节点代码并执行评测

        评测方式：
        - 有 test_cases 的节点：使用 JudgeService 实际评测
        - 无 test_cases 的节点：按代码完整性简单评分

        四维能量计算：
        - 理解力（understanding）：根据得分计算
        - 实现力（implementation）：根据得分计算
        - 优化力（optimization）：根据执行时间计算
        - 创造力（creativity）：根据尝试次数计算

        Args:
            user_id: 用户 ID
            node_id: 节点 ID
            code: 用户提交的代码

        Returns:
            包含状态、分数、能量值、输出等信息的字典
        """
        # 获取节点信息
        result = await self.db.execute(select(NeuronNode).where(NeuronNode.id == node_id))
        node = result.scalars().first()
        if not node:
            return {"status": "error", "score": 0, "xp_earned": 0, "energy_score": 0,
                    "energy_detail": {}, "stdout": "", "stderr": "", "execution_time": 0,
                    "encouragement_message": "节点不存在", "test_results": [], "ai_analysis": ""}

        # Agent 节点评分：有 test_cases 用实际评测，否则用代码完整性评分
        if node.test_cases:
            import asyncio, json
            test_cases = json.loads(node.test_cases) if isinstance(node.test_cases, str) else node.test_cases
            judge = JudgeService(self.db)
            # 构造临时 lesson 对象传递 test_cases
            fake_xp = node.xp_reward or 10
            class _FakeLesson:
                pass
            _FakeLesson.test_cases = test_cases
            _FakeLesson.xp_reward = fake_xp
            judge_result = await judge.submit_and_judge(
                user_id=user_id, lesson_id=0, code=code, language="python"
            )
            # lesson_id=0 时 judge 返回错误，使用 fake lesson 重新评测
            if judge_result.get("status") == "error" and "课时不存在" in str(judge_result.get("stderr", "")):
                sync_result = await asyncio.to_thread(judge._run_and_judge_sync, code, "python", _FakeLesson())
                judge_result = {"status": sync_result["status"], "score": sync_result.get("score", 0),
                               "stdout": sync_result.get("stdout", ""), "stderr": sync_result.get("stderr", ""),
                               "execution_time": sync_result.get("execution_time", 0),
                               "test_results": sync_result.get("test_results", []), "encouragement_message": ""}
        else:
            score = 100 if len(code.strip()) > 10 else 50
            judge_result = {"status": "accepted" if score >= 80 else "wrong", "score": score,
                           "stdout": "", "stderr": "", "execution_time": 0,
                           "test_results": [], "encouragement_message": ""}

        score = judge_result.get("score", 0)
        xp_earned = max(0, score // 10)

        # 查询或创建进度记录
        prog_result = await self.db.execute(
            select(AgentProgress).where(AgentProgress.user_id == user_id, AgentProgress.node_id == node_id)
        )
        progress = prog_result.scalars().first()
        if not progress:
            progress = AgentProgress(user_id=user_id, node_id=node_id, status="in_progress", attempts=0)
            self.db.add(progress)
            await self.db.flush()

        # 根据实际成绩动态计算四维能量
        exec_time = judge_result.get("execution_time", 999)
        attempts = (progress.attempts or 0) + 1
        understanding = min(5, max(1, (score + 19) // 20))     # 理解力：1-20→1, 21-40→2, ..., 81-100→5
        implementation = min(5, max(1, (score + 19) // 20))     # 实现力：同上
        optimization = min(5, max(1, 5 - (exec_time // 500)))   # 优化力：<500ms→5, 500-999→4, ...
        creativity = min(5, max(1, 6 - (attempts // 2)))        # 创造力：1-2次→5, 3-4→4, ...
        energy = {
            "understanding": understanding * 20,
            "implementation": implementation * 20,
            "optimization": optimization * 20,
            "creativity": creativity * 20,
        }
        energy_score = (understanding + implementation + optimization + creativity) // 4

        # 更新进度记录
        progress.attempts = (progress.attempts or 0) + 1
        progress.best_code = code
        progress.energy_detail = energy
        progress.energy_score = energy_score
        if judge_result.get("status") == SubmissionStatus.accepted or score >= 80:
            progress.status = "completed"
        if energy_score >= 4:
            progress.status = "mastered"

        # 奖励经验值并更新用户连续打卡
        if xp_earned > 0:
            user_result = await self.db.execute(select(User).where(User.id == user_id))
            user = user_result.scalars().first()
            if user:
                user.xp = (user.xp or 0) + xp_earned
                user.level = max(1, (user.xp or 0) // 100 + 1)
                today = datetime.now(timezone.utc).date()
                last = user.last_login_at.date() if user.last_login_at else None
                if last is None:
                    user.streak_days = 1
                elif last == today:
                    pass
                elif last == today - timedelta(days=1):
                    user.streak_days = (user.streak_days or 0) + 1
                else:
                    user.streak_days = 1
                user.last_login_at = datetime.now(timezone.utc)

        # 生成鼓励消息
        if score >= 80:
            encouragement = "出色完成！继续探索智能体的奥秘吧！"
        elif score > 0:
            encouragement = "方向正确！再优化一下代码就能通过了。"
        else:
            encouragement = "代码有错误，请检查后重试。"

        return {
            "status": "accepted" if score >= 80 else "wrong" if score > 0 else "error",
            "score": score, "xp_earned": xp_earned,
            "energy_score": energy_score, "energy_detail": energy,
            "stdout": judge_result.get("stdout", ""),
            "stderr": judge_result.get("stderr", ""),
            "execution_time": judge_result.get("execution_time", 0),
            "encouragement_message": encouragement,
            "test_results": judge_result.get("test_results", []),
            "ai_analysis": judge_result.get("ai_analysis", ""),
        }

    async def get_user_progress(self, user_id: int) -> list:
        """获取用户在智能体工坊的所有进度记录

        Args:
            user_id: 用户 ID

        Returns:
            进度记录列表
        """
        result = await self.db.execute(select(AgentProgress).where(AgentProgress.user_id == user_id))
        progress_list = result.scalars().all()
        return [{
            "id": p.id, "node_id": p.node_id, "status": p.status,
            "energy_score": p.energy_score, "energy_detail": p.energy_detail,
            "best_code": p.best_code, "attempts": p.attempts,
            "completed_at": p.completed_at, "created_at": p.created_at,
        } for p in progress_list]

    async def get_tracks_overview(self, user_id: int) -> list:
        """获取所有学习路线的概览信息

        统计每条路线的总节点数和用户已完成节点数。

        Args:
            user_id: 用户 ID

        Returns:
            路线概览列表，包含 track、name、description、total_nodes、completed_nodes、sections
        """
        result = await self.db.execute(select(NeuronNode).where(NeuronNode.is_active == True))
        all_nodes = result.scalars().all()
        progress_result = await self.db.execute(select(AgentProgress).where(AgentProgress.user_id == user_id))
        progress_list = progress_result.scalars().all()
        completed_ids = {p.node_id for p in progress_list if p.status in ("completed", "mastered")}

        tracks = []
        for track_key, track_info in TRACK_INFO.items():
            track_nodes = [n for n in all_nodes if n.track == track_key]
            # 提取唯一的分组（section）
            sections = list(dict.fromkeys(n.section for n in track_nodes if n.section))
            completed = sum(1 for n in track_nodes if n.id in completed_ids)
            tracks.append({
                "track": track_key, "name": track_info["name"],
                "description": track_info["description"],
                "total_nodes": len(track_nodes), "completed_nodes": completed,
                "sections": sections,
            })
        return tracks

    def _resolve_status(self, node, progress, progress_map: dict | None = None) -> str:
        """根据节点信息和用户进度解析节点状态

        状态规则：
        - 已完成或精通 -> completed / mastered
        - 有进度记录但未完成 -> in_progress
        - 没有前置节点 -> available
        - 前置节点全部完成 -> available
        - 否则 -> locked

        Args:
            node: 节点对象
            progress: 用户的节点进度（可能为 None）
            progress_map: 所有节点进度的映射字典（可选，用于批量判断）

        Returns:
            节点状态字符串
        """
        if progress and progress.status in ("completed", "mastered"):
            return progress.status
        if progress:
            return "in_progress"
        # 没有前置节点 -> 直接可用
        if not node.prerequisites:
            return "available"
        # 有前置节点 -> 检查是否全部完成
        if progress_map is not None:
            all_done = all(
                progress_map.get(pid) and progress_map[pid].status in ("completed", "mastered")
                for pid in node.prerequisites
            )
            if all_done:
                return "available"
        return "locked"
