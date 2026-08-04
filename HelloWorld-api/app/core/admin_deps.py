"""管理后台依赖注入 - 管理员认证和角色权限校验"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.core.security import decode_access_token

admin_security = HTTPBearer()

# 角色权限等级映射（数值越大权限越高）
ROLE_LEVELS = {
    "viewer": 1,   # 只读权限
    "editor": 2,   # 编辑权限
    "admin": 3,    # 超级管理员
}


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(admin_security),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """从 JWT token 中解析当前管理员"""
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的管理员认证凭据",
        )

    # 检查 token 类型是否为管理员，拒绝普通用户 token
    if payload.get("type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要管理员权限",
        )

    admin_id = payload.get("sub")
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    try:
        aid = int(admin_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    # 从数据库查询管理员
    result = await db.execute(select(AdminUser).where(AdminUser.id == aid))
    admin = result.scalars().first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="管理员账户不存在",
        )

    # 检查管理员是否被禁用
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理员账户已禁用",
        )

    return admin


def require_role(min_role: str):
    """角色权限校验 - 返回一个依赖

    用法: Depends(require_role("editor"))
    要求当前管理员的角色等级不低于 min_role。
    """
    async def role_checker(
        current_admin: AdminUser = Depends(get_current_admin),
    ) -> AdminUser:
        min_level = ROLE_LEVELS.get(min_role, 99)
        admin_level = ROLE_LEVELS.get(current_admin.role, 0)
        if admin_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要 {min_role} 及以上权限",
            )
        return current_admin
    return role_checker
