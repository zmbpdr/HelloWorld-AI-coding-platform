"""管理后台仪表盘路由

提供管理后台首页的核心指标数据和趋势图表数据。
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.admin import AdminUser
from app.schemas.admin import DashboardStats, DashboardChart
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取仪表盘核心指标

    包括总用户数、总提交数、活跃用户数等概览数据。
    """
    service = AdminService(db)
    return await service.get_dashboard_stats()


@router.get("/dashboard/chart", response_model=DashboardChart)
async def get_dashboard_chart(
    days: int = 7,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取趋势图数据

    返回指定天数内的每日新增用户数和提交数，用于前端图表展示。
    """
    service = AdminService(db)
    data = await service.get_dashboard_chart(days)
    non_zero = [d for d in data if d["submissions"] > 0 or d["new_users"] > 0]
    logger.info(f"Chart data ({days}d): {len(non_zero)} non-zero days out of {len(data)}")
    if non_zero:
        logger.info(f"First non-zero: {non_zero[0]}")
    return DashboardChart(data=data)
