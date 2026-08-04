"""免费/Pro Mock 会员与每日 AI 配额。

提供会员信息展示和 AI 调用配额消耗功能。
Pro 用户无限制，免费用户每日有调用次数上限。
"""
from datetime import date

from fastapi import HTTPException

from app.config import settings
from app.models.user import User


def membership_payload(user: User) -> dict:
    """构建会员信息响应

    Args:
        user: 用户对象

    Returns:
        包含会员等级、AI 调用次数、配额限制等信息的字典
    """
    is_pro = user.membership == "pro"
    return {
        "membership_tier": "pro" if is_pro else "free",
        "ai_calls_used": 0 if is_pro else user.ai_usage_today or 0,
        "ai_calls_limit": None if is_pro else settings.FREE_DAILY_AI_QUOTA,
        "is_unlimited": is_pro,
    }


def consume_ai_quota(user: User) -> None:
    """一次真实 AI 调用前扣减免费用户的每日配额。

    如果用户是 Pro 会员则无限制。
    免费用户每日配额用尽时抛出 403 异常。

    Args:
        user: 用户对象

    Raises:
        HTTPException: 免费用户配额用尽时抛出 403
    """
    if user.membership == "pro":
        return

    today = date.today()
    # 跨天重置计数器
    if user.ai_usage_date != today:
        user.ai_usage_date = today
        user.ai_usage_today = 0

    # 检查配额是否用尽
    if (user.ai_usage_today or 0) >= settings.FREE_DAILY_AI_QUOTA:
        raise HTTPException(
            status_code=403,
            detail=f"免费版每日可使用 {settings.FREE_DAILY_AI_QUOTA} 次 小智，升级 Pro 后可无限使用。",
        )

    # 增加调用计数
    user.ai_usage_today = (user.ai_usage_today or 0) + 1
