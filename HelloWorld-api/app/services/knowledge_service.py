"""知识掌握度服务 — 每次提交代码后更新用户对知识点的掌握程度

通过加权平均计算掌握度（mastery = 最新得分 x 0.6 + 历史掌握度 x 0.4），
记录每个知识点的总尝试次数和正确次数，支持查询全部知识掌握度。
"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.knowledge import UserKnowledge


async def update_knowledge(
    db: AsyncSession,
    user_id: int,
    knowledge_tags: list[str],
    score: int,
    is_passed: bool = False,
):
    """
    每次提交代码后更新知识掌握度。

    掌握度采用平滑更新策略：mastery = 最近一次得分 x 0.6 + 历史掌握度 x 0.4。
    score >= 80 时视为正确，计入正确次数。

    Args:
        db: 数据库会话
        user_id: 用户 ID
        knowledge_tags: 知识点标签列表
        score: 本次得分（0-100）
        is_passed: 是否通过（score >= 80）
    """
    if not knowledge_tags:
        return

    for tag in knowledge_tags:
        if not tag:
            continue

        # 查询该知识点记录
        result = await db.execute(
            select(UserKnowledge).where(
                UserKnowledge.user_id == user_id,
                UserKnowledge.knowledge_tag == tag,
            )
        )
        knowledge = result.scalars().first()

        if not knowledge:
            # 不存在则创建新记录
            knowledge = UserKnowledge(
                user_id=user_id,
                knowledge_tag=tag,
                mastery=0.0,
                total_attempts=0,
                correct_count=0,
            )
            db.add(knowledge)

        # 更新统计
        knowledge.total_attempts += 1
        if is_passed:
            knowledge.correct_count += 1

        # 掌握度 = 最近得分 x 0.6 + 历史掌握度 x 0.4（平滑更新）
        knowledge.mastery = round(
            min(100.0, score * 0.6 + (knowledge.mastery or 0) * 0.4),
            1,
        )
        knowledge.last_practice_at = datetime.now(timezone.utc)

    await db.commit()


async def get_user_knowledge(db: AsyncSession, user_id: int) -> list[dict]:
    """获取用户所有知识掌握度

    Args:
        db: 数据库会话
        user_id: 用户 ID

    Returns:
        知识掌握度列表，每个元素包含 tag、mastery、total_attempts、correct_count、last_practice_at
    """
    result = await db.execute(
        select(UserKnowledge).where(UserKnowledge.user_id == user_id)
    )
    knowledge_list = result.scalars().all()
    return [
        {
            "tag": k.knowledge_tag,
            "mastery": round(k.mastery, 1),
            "total_attempts": k.total_attempts,
            "correct_count": k.correct_count,
            "last_practice_at": k.last_practice_at.isoformat() if k.last_practice_at else None,
        }
        for k in knowledge_list
    ]
