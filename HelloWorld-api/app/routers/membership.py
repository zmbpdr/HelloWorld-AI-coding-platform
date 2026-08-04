"""会员 Mock 路由：不接真实支付，仅用于产品演示。

提供会员信息查询和升级功能，仅供演示用途。
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import MembershipResponse, UpgradeRequest
from app.services.membership_service import membership_payload
from app.config import settings

router = APIRouter()


@router.get("/users/me/membership", response_model=MembershipResponse)
async def get_membership(current_user: User = Depends(get_current_user)):
    """获取当前用户的会员信息"""
    return membership_payload(current_user)


@router.post("/users/me/upgrade", response_model=MembershipResponse)
async def upgrade_membership(
    _request: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """升级为 Pro 会员（Mock 接口，不涉及真实支付）"""
    if not settings.FEATURE_MEMBERSHIP:
        return membership_payload(current_user)
    current_user.membership = "pro"
    await db.commit()
    await db.refresh(current_user)
    return membership_payload(current_user)
