"""提交路由 - 代码提交记录查询"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.submission import Submission
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/submissions")
async def get_submissions(
    lesson_id: int | None = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的代码提交记录"""
    query = (
        select(Submission)
        .where(Submission.user_id == current_user.id)
        .order_by(desc(Submission.created_at))
    )
    if lesson_id:
        query = query.where(Submission.lesson_id == lesson_id)

    query = query.limit(limit)
    result = await db.execute(query)
    submissions = result.scalars().all()

    return {
        "data": [
            {
                "id": s.id,
                "lesson_id": s.lesson_id,
                "language": s.language,
                "status": s.status,
                "score": s.score,
                "execution_time": s.execution_time,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            }
            for s in submissions
        ]
    }


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取指定提交的详细信息（含代码）"""
    result = await db.execute(
        select(Submission).where(
            Submission.id == submission_id,
            Submission.user_id == current_user.id,
        )
    )
    submission = result.scalars().first()

    if not submission:
        raise HTTPException(status_code=404, detail="提交记录不存在")

    return {
        "id": submission.id,
        "lesson_id": submission.lesson_id,
        "code": submission.code,
        "language": submission.language,
        "status": submission.status,
        "score": submission.score,
        "stdout": submission.stdout,
        "stderr": submission.stderr,
        "execution_time": submission.execution_time,
        "memory_used": submission.memory_used,
        "ai_feedback": submission.ai_feedback,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
    }
