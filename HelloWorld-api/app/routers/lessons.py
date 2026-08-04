"""课时路由 - 获取课时内容、提交代码、获取提示

处理关卡的获取、代码提交评测、统计数据和 AI 提示等操作。
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.lesson import Lesson
from app.models.progress import Progress
from app.models.submission import Submission
from app.models.user import User
from app.schemas.course import LessonBrief, RecommendationResponse, SubmitCodeRequest
from app.core.deps import get_current_user
from app.core.rate_limit import submit_limiter
from app.services.judge_service import JudgeService
from app.services.recommendation_service import get_recommendation

router = APIRouter()


@router.get("/lessons/recommend", response_model=RecommendationResponse)
async def recommend_lessons(
    language: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """推荐覆盖用户最低掌握度标签的未完成关卡。

    ``language`` 为可选参数，供 CourseMap 在当前语言地图中渲染标记；
    未提供时按全部六语言的稳定顺序执行顺序兜底。
    """
    return await get_recommendation(db, current_user.id, language)


@router.get("/lessons/{lesson_id}")
async def get_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取课时内容

    返回课时的完整信息，包括该用户的学习进度和最佳提交代码。
    """
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalars().first()

    if not lesson:
        raise HTTPException(status_code=404, detail="课时不存在")

    # 获取用户学习进度
    progress_result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.lesson_id == lesson_id,
        )
    )
    progress = progress_result.scalars().first()

    # 获取用户最佳提交（按得分降序取第一条）
    submission_result = await db.execute(
        select(Submission)
        .where(Submission.user_id == current_user.id, Submission.lesson_id == lesson_id)
        .order_by(Submission.score.desc())
        .limit(1)
    )
    best_submission = submission_result.scalars().first()

    return {
        "id": lesson.id,
        "title": lesson.title,
        "slug": lesson.slug,
        "description": lesson.description,
        "content": lesson.content,
        "order": lesson.order,
        "difficulty": lesson.difficulty,
        "xp_reward": lesson.xp_reward,
        "starter_code": lesson.starter_code,
        "hint": lesson.hint,
        "status": progress.status if progress else "available",
        "best_code": best_submission.code if best_submission else None,
        "best_score": best_submission.score if best_submission else 0,
        "attempts": progress.attempts if progress else 0,
    }


@router.post("/lessons/{lesson_id}/submit")
async def submit_code(
    lesson_id: int,
    request: SubmitCodeRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交代码评测

    提交用户代码到评测系统，执行测试用例并返回评测结果。
    """
    await submit_limiter(request=req, identifier=str(current_user.id))

    # 查询课时及其所属语言，确定执行环境
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.language))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="课时不存在")

    # 调用评测服务执行代码评测
    judge_service = JudgeService(db)
    result = await judge_service.submit_and_judge(
        user_id=current_user.id,
        lesson_id=lesson_id,
        code=request.code,
        language=lesson.language.slug if lesson.language else "python",
    )
    await db.commit()
    return result


@router.get("/lessons/{lesson_id}/stats")
async def get_lesson_stats(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取课时提交统计：执行时间历史 + 错误类型分布"""
    result = await db.execute(
        select(Submission)
        .where(Submission.user_id == current_user.id, Submission.lesson_id == lesson_id)
        .order_by(Submission.id)
    )
    submissions = result.scalars().all()

    # 构建提交时间线
    timeline = []
    error_counts = {"syntax": 0, "runtime": 0, "timeout": 0, "logic": 0}
    for s in submissions:
        timeline.append({
            "attempt": len(timeline) + 1,
            "score": s.score or 0,
            "execution_time": round(s.execution_time or 0, 1),
            "status": s.status,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        })
        # 分类统计错误类型
        if s.status in ("error", "timeout"):
            error_counts["timeout" if s.status == "timeout" else "runtime"] += 1
        elif s.status == "wrong":
            error_counts["logic"] += 1
        elif s.score == 0:
            error_counts["syntax"] += 1

    return {
        "total_attempts": len(timeline),
        "best_score": max((s["score"] for s in timeline), default=0),
        "avg_time": round(sum(s["execution_time"] for s in timeline) / len(timeline), 1) if timeline else 0,
        "timeline": timeline,
        "error_counts": error_counts,
    }


@router.get("/lessons/{lesson_id}/hint")
async def get_hint(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取 AI 提示"""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalars().first()

    if not lesson:
        raise HTTPException(status_code=404, detail="课时不存在")

    return {"hint": lesson.hint or "暂无提示"}
