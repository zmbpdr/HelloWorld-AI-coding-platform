"""免费/Pro Mock 会员与每日 AI 配额。"""
from datetime import date

from fastapi import HTTPException

from app.config import settings
from app.models.user import User


def membership_payload(user: User) -> dict:
    is_pro = user.membership == "pro"
    return {
        "membership_tier": "pro" if is_pro else "free",
        "ai_calls_used": 0 if is_pro else user.ai_usage_today or 0,
        "ai_calls_limit": None if is_pro else settings.FREE_DAILY_AI_QUOTA,
        "is_unlimited": is_pro,
    }


def consume_ai_quota(user: User) -> None:
    """一次真实 AI 调用前扣减免费用户的每日配额。"""
    if user.membership == "pro":
        return
    today = date.today()
    if user.ai_usage_date != today:
        user.ai_usage_date = today
        user.ai_usage_today = 0
    if (user.ai_usage_today or 0) >= settings.FREE_DAILY_AI_QUOTA:
        raise HTTPException(
            status_code=403,
            detail=f"免费版每日可使用 {settings.FREE_DAILY_AI_QUOTA} 次 AI 导师，升级 Pro 后可无限使用。",
        )
    user.ai_usage_today = (user.ai_usage_today or 0) + 1
