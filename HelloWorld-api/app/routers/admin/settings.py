"""管理员后台系统设置路由

提供系统配置的查看和更新功能，仅允许白名单内的配置键被修改。
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.admin import AdminUser
from app.schemas.admin import SystemSettingUpdate
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()

# 允许更新的配置键白名单（防止任意修改导致安全问题）
ALLOWED_SETTING_KEYS = {
    "ollama_url",
    "ai_mode",
    "editor_font_size",
    "theme",
    "site_name",
    "site_description",
    "max_submission_per_day",
    "registration_enabled",
    "sandbox_memory_limit",
    "sandbox_cpu_limit",
    "sandbox_pid_limit",
    "sandbox_timeout",
    "scoring_pass_score",
    "scoring_xp_multiplier",
}


@router.get("/settings")
async def get_settings(
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """获取所有系统配置"""
    service = AdminService(db)
    return {"items": await service.get_all_settings()}


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    data: SystemSettingUpdate,
    current_admin: AdminUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """更新系统配置（仅限白名单中的配置键）"""
    if key not in ALLOWED_SETTING_KEYS:
        raise HTTPException(status_code=400, detail=f"不允许修改配置项: {key}")
    service = AdminService(db)
    setting = await service.update_setting(key, data.value, current_admin.id)
    await db.commit()
    return {"key": setting.key, "value": setting.value}
