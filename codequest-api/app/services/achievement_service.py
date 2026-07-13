"""成就服务 - 用户成就查询"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.achievement import Achievement, UserAchievement


class AchievementService:
    """成就服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_achievements(self, user_id: int) -> list[dict]:
        """获取用户已解锁的所有成就"""
        result = await self.db.execute(
            select(UserAchievement)
            .options(selectinload(UserAchievement.achievement))
            .where(UserAchievement.user_id == user_id)
            .order_by(UserAchievement.unlocked_at.desc())
        )
        user_achievements = result.scalars().all()

        return [
            {
                "id": ua.achievement.id,
                "name": ua.achievement.name,
                "slug": ua.achievement.slug,
                "description": ua.achievement.description,
                "icon_url": ua.achievement.icon_url,
                "rarity": ua.achievement.rarity,
            "unlocked": True,
                "xp_reward": ua.achievement.xp_reward,
                "unlocked_at": ua.unlocked_at.isoformat() if ua.unlocked_at else None,
            }
            for ua in user_achievements
        ]
