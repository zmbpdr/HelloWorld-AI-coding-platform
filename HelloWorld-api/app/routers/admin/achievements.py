"""管理后台成就管理路由

提供成就的列表查询、新增和编辑功能。
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.models.achievement import Achievement
from app.schemas.admin import AdminAchievementCreate, AdminAchievementUpdate
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


@router.get("/achievements")
async def list_achievements(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取成就列表"""
    result = await db.execute(select(Achievement).order_by(Achievement.id))
    achievements = result.scalars().all()
    return {"items": [
        {
            "id": a.id, "slug": a.slug, "name": a.name,
            "description": a.description, "rarity": a.rarity,
            "condition_type": a.condition_type, "condition_value": a.condition_value,
        }
        for a in achievements
    ]}


@router.post("/achievements", status_code=201)
async def create_achievement(
    data: AdminAchievementCreate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """新增成就"""
    achievement = Achievement(**data.model_dump())
    db.add(achievement)
    await db.flush()

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, "create", "achievement", achievement.id, new_value=data.model_dump())

    await db.commit()
    return {"id": achievement.id, "message": "成就已创建"}


@router.put("/achievements/{achievement_id}")
async def update_achievement(
    achievement_id: int,
    data: AdminAchievementUpdate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """编辑成就"""
    result = await db.execute(select(Achievement).where(Achievement.id == achievement_id))
    achievement = result.scalars().first()
    if not achievement:
        raise HTTPException(status_code=404, detail="成就不存在")

    # 只更新请求中提供的字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(achievement, key, value)

    await db.flush()

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, "update", "achievement", achievement_id, new_value=update_data)

    await db.commit()
    return {"message": "成就已更新"}
