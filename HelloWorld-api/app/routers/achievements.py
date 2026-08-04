"""成就路由 - 获取用户成就

提供用户已获得成就的查询功能。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.services.achievement_service import AchievementService

router = APIRouter()


@router.get("/users/me/achievements")
async def get_my_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的所有成就"""
    service = AchievementService(db)
    achievements = await service.get_user_achievements(current_user.id)
    return {"data": achievements}
