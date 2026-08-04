"""排行榜路由

提供按经验值（XP）和完成课时数排序的用户排行榜。
支持按周、月、全部时间三个维度筛选。
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.progress import Progress
from app.models.enums import ProgressStatus

router = APIRouter()


@router.get("/leaderboard")
async def get_leaderboard(
    period: str = Query("all", description="时间范围: week/month/all"),
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取排行榜（按 XP 和完成课时数排序）"""
    # 按 XP 降序获取用户列表
    query = select(User.username, User.avatar, User.xp, User.level, User.streak_days, User.id).order_by(desc(User.xp)).limit(limit)
    result = await db.execute(query)
    users = list(result.all())

    if not users:
        return {"data": [], "period": period}

    user_ids = [u.id for u in users]

    # 计算时间过滤条件
    since: datetime | None = None
    if period == "week":
        since = datetime.now(timezone.utc) - timedelta(days=7)
    elif period == "month":
        since = datetime.now(timezone.utc) - timedelta(days=30)

    # 一次查询获取所有用户的完成课时数
    count_query = select(
        Progress.user_id, func.count(Progress.id)
    ).where(
        Progress.user_id.in_(user_ids),
        Progress.status == ProgressStatus.completed,
    )
    if since:
        count_query = count_query.where(Progress.completed_at >= since)
    count_query = count_query.group_by(Progress.user_id)

    count_result = await db.execute(count_query)
    completed_map = dict(count_result.all())

    # 汇总数据并排序
    leaderboard_data = []
    for u in users:
        completed = completed_map.get(u.id, 0)
        if period != "all" and completed == 0:
            continue  # 时间段内无完成的用户不显示
        leaderboard_data.append({
            "username": u.username,
            "avatar": u.avatar,
            "xp": u.xp or 0,
            "level": u.level or 1,
            "completed_lessons": completed,
            "streak_days": u.streak_days or 0,
        })

    # 按 XP 降序排列
    leaderboard_data.sort(key=lambda u: u["xp"], reverse=True)
    leaderboard_data = leaderboard_data[:limit]

    # 生成排名
    for i, entry in enumerate(leaderboard_data):
        entry["rank"] = i + 1

    return {"data": leaderboard_data, "period": period}
