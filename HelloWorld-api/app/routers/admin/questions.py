"""管理后台题库管理路由

提供题目的增删改查功能，支持按语言、难度、题型筛选。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.models.question import Question
from app.schemas.admin import (
    AdminQuestionCreate,
    AdminQuestionUpdate,
    AdminQuestionResponse,
    VALID_QUESTION_TYPES,
)
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


def _validate_question_type(question_type: str) -> None:
    """校验题目类型是否合法"""
    if question_type not in VALID_QUESTION_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"无效的题目类型 '{question_type}'，支持: {', '.join(sorted(VALID_QUESTION_TYPES))}",
        )


@router.get("/questions")
async def list_questions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    language_id: int | None = None,
    difficulty: str | None = None,
    question_type: str | None = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取题目列表（支持分页和按语言/难度/题型筛选）"""
    service = AdminService(db)
    return await service.get_questions_list(
        page, page_size, language_id, difficulty, question_type,
    )


@router.get("/questions/{question_id}", response_model=AdminQuestionResponse)
async def get_question(
    question_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取题目详情"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.post("/questions", response_model=AdminQuestionResponse, status_code=201)
async def create_question(
    data: AdminQuestionCreate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """新增题目"""
    # 校验题目类型
    _validate_question_type(data.question_type)

    # 校验 slug 唯一性
    existing = await db.execute(select(Question).where(Question.slug == data.slug))
    if existing.scalars().first():
        raise HTTPException(status_code=422, detail=f"Slug '{data.slug}' 已存在")

    question = Question(**data.model_dump())
    db.add(question)
    await db.flush()
    await db.refresh(question)

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(
        current_admin.id, "create", "question", question.id,
        new_value=data.model_dump(),
    )

    await db.commit()
    return question


@router.put("/questions/{question_id}", response_model=AdminQuestionResponse)
async def update_question(
    question_id: int,
    data: AdminQuestionUpdate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """编辑题目"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 记录旧值（用于审计日志）
    old_data = jsonable_encoder(
        {c.name: getattr(question, c.name) for c in question.__table__.columns}
    )

    update_data = data.model_dump(exclude_unset=True)

    # 校验题目类型
    if "question_type" in update_data:
        _validate_question_type(update_data["question_type"])

    # 校验 slug 唯一性（如果 slug 有变更）
    if "slug" in update_data and update_data["slug"] != question.slug:
        existing = await db.execute(
            select(Question).where(Question.slug == update_data["slug"])
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=422,
                detail=f"Slug '{update_data['slug']}' 已存在",
            )

    for key, value in update_data.items():
        setattr(question, key, value)

    await db.flush()
    await db.refresh(question)

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(
        current_admin.id, "update", "question", question_id,
        old_value=old_data, new_value=update_data,
    )

    await db.commit()
    return question


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """软删除题目（将 is_active 设为 False）"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 软删除：标记为不可用，而非物理删除
    question.is_active = False

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, "delete", "question", question_id)

    await db.commit()
    return {"message": "已删除"}


@router.post("/questions/{question_id}/publish")
async def toggle_publish(
    question_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """发布/下架题目"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 切换发布状态
    question.is_active = not question.is_active
    action = "publish" if question.is_active else "unpublish"

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, action, "question", question_id)

    await db.commit()
    return {"message": f"已{'发布' if action == 'publish' else '下架'}"}