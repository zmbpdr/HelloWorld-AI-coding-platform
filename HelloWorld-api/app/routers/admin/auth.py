"""管理后台认证路由

提供管理员登录、登出和当前信息查询功能。
管理员认证体系与普通用户完全隔离，使用独立的 token 类型标识。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.schemas.admin import AdminLogin, AdminToken, AdminUserResponse
from app.core.security import verify_password, create_access_token
from app.core.admin_deps import get_current_admin

router = APIRouter()


@router.post("/auth/login", response_model=AdminToken)
async def admin_login(request: AdminLogin, db: AsyncSession = Depends(get_db)):
    """管理员登录

    验证用户名密码和管理员启用状态，生成带 admin 标识的 JWT 令牌。
    该令牌只能访问管理后台接口，不能用于普通用户 API。
    """
    result = await db.execute(select(AdminUser).where(AdminUser.username == request.username))
    admin = result.scalars().first()

    if not admin or not verify_password(request.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    if not admin.is_active:
        raise HTTPException(status_code=403, detail="管理员账户已禁用")

    # 更新最后登录时间
    admin.last_login_at = datetime.now(timezone.utc)

    # 生成 JWT（包含 type=admin 标识，与普通用户 token 区分）
    access_token = create_access_token(
        data={"sub": str(admin.id), "type": "admin", "role": admin.role}
    )
    return AdminToken(access_token=access_token)


@router.post("/auth/logout")
async def admin_logout():
    """管理员登出（JWT 无状态，前端清除即可）"""
    return {"message": "已登出"}


@router.get("/auth/me", response_model=AdminUserResponse)
async def admin_me(current_admin: AdminUser = Depends(get_current_admin)):
    """获取当前管理员信息"""
    return current_admin
