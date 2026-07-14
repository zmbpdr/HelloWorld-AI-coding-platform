"""知识掌握度服务 — 每次提交代码后更新用户对知识点的掌握程度"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.knowledge import UserKnowledge


async def update_knowledge(
    db: AsyncSession,
    user_id: int,
    knowledge_tags: list[str],
    is_correct: bool,
):
    """
    每次提交代码后更新知识掌握度。

    加权计算：mastery = (correct_count / total_attempts) * 100
    """
    if not knowledge_tags:
        return

    for tag in knowledge_tags:
        if not tag:
            continue

        result = await db.execute(
            select(UserKnowledge).where(
                UserKnowledge.user_id == user_id,
                UserKnowledge.knowledge_tag == tag,
            )
        )
        knowledge = result.scalars().first()

        if not knowledge:
            knowledge = UserKnowledge(
                user_id=user_id,
                knowledge_tag=tag,
                mastery=0.0,
                total_attempts=0,
                correct_count=0,
            )
            db.add(knowledge)

        knowledge.total_attempts += 1
        if is_correct:
            knowledge.correct_count += 1

        # 加权掌握度计算
        knowledge.mastery = min(
            100.0,
            (knowledge.correct_count / max(1, knowledge.total_attempts)) * 100,
        )
        knowledge.last_practice_at = datetime.now(timezone.utc)

    await db.commit()


async def get_user_knowledge(db: AsyncSession, user_id: int) -> list[dict]:
    """获取用户所有知识掌握度"""
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