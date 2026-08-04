"""管理后台用户管理路由

提供用户的列表查询、详情查看和封禁/解封操作。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.models.user import User
from app.schemas.admin import AdminUserBan
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """获取用户列表（支持分页和搜索）"""
    service = AdminService(db)
    return await service.get_users_list(page, page_size, search)


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: int,
    current_admin: AdminUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """获取用户详情"""
    service = AdminService(db)
    detail = await service.get_user_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="用户不存在")
    return detail


@router.put("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    data: AdminUserBan,
    current_admin: AdminUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """封禁/解封用户"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 使用独立字段存储封禁状态，与正常状态分离
    if data.is_banned:
        user.is_banned = True
        user.banned_reason = data.reason
    else:
        user.is_banned = False
        user.banned_reason = None

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(
        current_admin.id,
        "ban" if data.is_banned else "unban",
        "user", user_id,
        new_value={"is_banned": data.is_banned, "reason": data.reason},
    )

    await db.commit()
    return {"message": f"用户已{'封禁' if data.is_banned else '解封'}"}
