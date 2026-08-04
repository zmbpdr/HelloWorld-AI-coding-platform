"""进度路由 - 获取用户学习进度和统计

包括用户信息、学习进度列表、统计数据、活动热力图和知识掌握度。
"""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.submission import Submission

from app.database import get_db
from app.models.user import User
from app.models.progress import Progress
from app.models.enums import ProgressStatus
from app.core.deps import get_current_user
from app.schemas.user import UserResponse
from app.services.knowledge_service import get_user_knowledge

router = APIRouter()


@router.get("/users/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return current_user


@router.get("/users/me/progress")
async def get_my_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的所有学习进度"""
    result = await db.execute(
        select(Progress).where(Progress.user_id == current_user.id)
    )
    progress_list = result.scalars().all()

    return {
        "data": [
            {
                "lesson_id": p.lesson_id,
                "status": p.status,
                "best_score": p.best_score,
                "attempts": p.attempts,
                "completed_at": p.completed_at,
            }
            for p in progress_list
        ]
    }


@router.get("/users/me/stats")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的统计数据"""
    # 完成的课时数
    completed_result = await db.execute(
        select(func.count()).select_from(Progress).where(
            Progress.user_id == current_user.id,
            Progress.status == ProgressStatus.completed,
        )
    )
    completed_lessons = completed_result.scalar() or 0

    # 总提交次数
    from app.models.submission import Submission
    submissions_result = await db.execute(
        select(func.count()).select_from(Submission).where(
            Submission.user_id == current_user.id,
        )
    )
    total_submissions = submissions_result.scalar() or 0

    # 一次通过的课时数（attempts == 1 完成）
    first_pass_result = await db.execute(
        select(func.count()).select_from(Progress).where(
            Progress.user_id == current_user.id,
            Progress.status == ProgressStatus.completed,
            Progress.attempts == 1,
        )
    )
    first_pass_count = first_pass_result.scalar() or 0

    return {
        "data": {
            "username": current_user.username,
            "level": current_user.level,
            "xp": current_user.xp,
            "streak_days": current_user.streak_days,
            "completed_lessons": completed_lessons,
            "total_submissions": total_submissions,
            "first_pass_count": first_pass_count,
        }
    }


@router.get("/users/me/activity")
async def get_activity_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取近 90 天每日提交数（用于热力图）"""
    ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
    # 按日期分组统计提交次数
    result = await db.execute(
        select(
            func.date(Submission.submitted_at).label("day"),
            func.count(Submission.id).label("count"),
        )
        .where(
            Submission.user_id == current_user.id,
            Submission.submitted_at >= ninety_days_ago,
        )
        .group_by(func.date(Submission.submitted_at))
        .order_by("day")
    )

    rows = result.all()
    daily: dict[str, int] = {}
    for row in rows:
        if row.day:
            daily[str(row.day)] = row.count

    # 填充没有提交的日期为 0
    today = date.today()
    activity = []
    for i in range(90, -1, -1):
        d = today - timedelta(days=i)
        key = d.isoformat()
        activity.append({"date": key, "count": daily.get(key, 0)})

    return {"activity": activity}


@router.get("/progress/knowledge")
async def get_knowledge(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的知识掌握度"""
    knowledge = await get_user_knowledge(db, current_user.id)
    return {"knowledge": knowledge}
