"""教程-题目关联路由

提供教程（关卡）与题库题目的关联管理：
- GET    /lessons/{lesson_id}/questions         获取关联题目 ID 列表
- PUT    /lessons/{lesson_id}/questions         全量替换关联题目
- DELETE /lessons/{lesson_id}/questions/{question_id}  取消单个关联
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.admin import AdminUser
from app.models.lesson import Lesson
from app.models.question import Question
from app.models.lesson_question import LessonQuestion
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


async def _ensure_lesson(db: AsyncSession, lesson_id: int) -> None:
    """确保教程（关卡）存在"""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="关卡不存在")


@router.get("/lessons/{lesson_id}/questions")
async def get_lesson_questions(
    lesson_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取教程已关联的题目 ID 列表（按关联顺序）"""
    await _ensure_lesson(db, lesson_id)
    result = await db.execute(
        select(LessonQuestion.question_id)
        .where(LessonQuestion.lesson_id == lesson_id)
        .order_by(LessonQuestion.order, LessonQuestion.id)
    )
    return [row[0] for row in result.all()]


@router.put("/lessons/{lesson_id}/questions")
async def set_lesson_questions(
    lesson_id: int,
    question_ids: list[int] = Body(..., embed=True),
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """全量替换教程关联的题目（事务）"""
    await _ensure_lesson(db, lesson_id)

    # 校验题目全部存在
    if question_ids:
        result = await db.execute(select(Question.id).where(Question.id.in_(question_ids)))
        existing_ids = {row[0] for row in result.all()}
        missing = [qid for qid in question_ids if qid not in existing_ids]
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"以下题目不存在: {missing}",
            )

    # 删除旧关联
    await db.execute(
        delete(LessonQuestion).where(LessonQuestion.lesson_id == lesson_id)
    )
    # 写入新关联
    for order, question_id in enumerate(question_ids):
        db.add(
            LessonQuestion(lesson_id=lesson_id, question_id=question_id, order=order)
        )
    await db.commit()
    return {"message": "关联已更新", "question_ids": question_ids}


@router.delete("/lessons/{lesson_id}/questions/{question_id}")
async def remove_lesson_question(
    lesson_id: int,
    question_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """取消单个题目与教程的关联"""
    await _ensure_lesson(db, lesson_id)
    await db.execute(
        delete(LessonQuestion).where(
            LessonQuestion.lesson_id == lesson_id,
            LessonQuestion.question_id == question_id,
        )
    )
    await db.commit()
    return {"message": "已取消关联"}