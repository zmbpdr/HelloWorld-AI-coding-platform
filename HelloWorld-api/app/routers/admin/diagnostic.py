"""管理后台诊断题管理路由

提供诊断题目的增删改查功能，支持排序和启用/停用。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.admin import AdminUser
from app.models.diagnostic_question import DiagnosticQuestion
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


@router.get("/diagnostic-questions")
async def list_diagnostic_questions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    tag: str | None = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取诊断题列表（支持分页和按标签筛选）"""
    query = select(DiagnosticQuestion)
    count_query = select(func.count(DiagnosticQuestion.id))

    if tag:
        query = query.where(DiagnosticQuestion.tag == tag)
        count_query = count_query.where(DiagnosticQuestion.tag == tag)

    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(
        query.order_by(DiagnosticQuestion.order).offset((page - 1) * page_size).limit(page_size)
    )
    questions = result.scalars().all()

    return {
        "items": [
            {
                "id": q.id,
                "question": q.question,
                "options": q.options,
                "answer": q.answer,
                "tag": q.tag,
                "order": q.order,
                "is_active": q.is_active,
                "created_at": q.created_at.isoformat() if q.created_at else None,
                "updated_at": q.updated_at.isoformat() if q.updated_at else None,
            }
            for q in questions
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/diagnostic-questions/{question_id}")
async def get_diagnostic_question(
    question_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取诊断题详情"""
    result = await db.execute(
        select(DiagnosticQuestion).where(DiagnosticQuestion.id == question_id)
    )
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="诊断题不存在")
    return {
        "id": question.id,
        "question": question.question,
        "options": question.options,
        "answer": question.answer,
        "tag": question.tag,
        "order": question.order,
        "is_active": question.is_active,
        "created_at": question.created_at.isoformat() if question.created_at else None,
        "updated_at": question.updated_at.isoformat() if question.updated_at else None,
    }


@router.post("/diagnostic-questions", status_code=201)
async def create_diagnostic_question(
    data: dict,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """新增诊断题"""
    question = DiagnosticQuestion(
        question=data["question"],
        options=data["options"],
        answer=data["answer"],
        tag=data.get("tag", ""),
        order=data.get("order", 0),
        is_active=data.get("is_active", True),
    )
    db.add(question)
    await db.flush()
    await db.refresh(question)

    service = AdminService(db)
    await service.log_action(
        current_admin.id, "create", "diagnostic_question", question.id,
        new_value=data,
    )
    await db.commit()
    return {
        "id": question.id,
        "question": question.question,
        "options": question.options,
        "answer": question.answer,
        "tag": question.tag,
        "order": question.order,
        "is_active": question.is_active,
    }


@router.put("/diagnostic-questions/{question_id}")
async def update_diagnostic_question(
    question_id: int,
    data: dict,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """编辑诊断题"""
    result = await db.execute(
        select(DiagnosticQuestion).where(DiagnosticQuestion.id == question_id)
    )
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="诊断题不存在")

    old_data = jsonable_encoder(
        {c.name: getattr(question, c.name) for c in question.__table__.columns}
    )

    updatable_fields = ["question", "options", "answer", "tag", "order", "is_active"]
    for key in updatable_fields:
        if key in data:
            setattr(question, key, data[key])

    await db.flush()
    await db.refresh(question)

    service = AdminService(db)
    await service.log_action(
        current_admin.id, "update", "diagnostic_question", question_id,
        old_value=old_data, new_value=data,
    )
    await db.commit()
    return {
        "id": question.id,
        "question": question.question,
        "options": question.options,
        "answer": question.answer,
        "tag": question.tag,
        "order": question.order,
        "is_active": question.is_active,
    }


@router.delete("/diagnostic-questions/{question_id}")
async def delete_diagnostic_question(
    question_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """软删除诊断题（将 is_active 设为 False）"""
    result = await db.execute(
        select(DiagnosticQuestion).where(DiagnosticQuestion.id == question_id)
    )
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="诊断题不存在")

    question.is_active = False

    service = AdminService(db)
    await service.log_action(current_admin.id, "delete", "diagnostic_question", question_id)
    await db.commit()
    return {"message": "已删除"}


@router.post("/diagnostic-questions/{question_id}/toggle")
async def toggle_diagnostic_question(
    question_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """启用/停用诊断题"""
    result = await db.execute(
        select(DiagnosticQuestion).where(DiagnosticQuestion.id == question_id)
    )
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="诊断题不存在")

    question.is_active = not question.is_active

    service = AdminService(db)
    await service.log_action(
        current_admin.id,
        "toggle",
        "diagnostic_question",
        question_id,
        new_value={"is_active": question.is_active},
    )
    await db.commit()
    return {"message": "已启用" if question.is_active else "已停用", "is_active": question.is_active}