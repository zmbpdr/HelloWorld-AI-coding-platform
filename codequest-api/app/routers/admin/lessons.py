"""管理后台课程管理路由"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.models.lesson import Lesson
from app.schemas.admin import AdminLessonCreate, AdminLessonUpdate, AdminLessonResponse
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


@router.get("/lessons")
async def list_lessons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    language_id: int | None = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取关卡列表"""
    service = AdminService(db)
    return await service.get_lessons_list(page, page_size, language_id)


@router.get("/lessons/{lesson_id}", response_model=AdminLessonResponse)
async def get_lesson(
    lesson_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取关卡详情"""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="关卡不存在")
    return lesson


@router.post("/lessons", response_model=AdminLessonResponse, status_code=201)
async def create_lesson(
    data: AdminLessonCreate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """新增关卡"""
    lesson = Lesson(**data.model_dump())
    db.add(lesson)
    await db.flush()
    await db.refresh(lesson)

    # 审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, "create", "lesson", lesson.id, new_value=data.model_dump())

    await db.commit()
    return lesson


@router.put("/lessons/{lesson_id}", response_model=AdminLessonResponse)
async def update_lesson(
    lesson_id: int,
    data: AdminLessonUpdate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """编辑关卡"""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="关卡不存在")

    # 记录旧值
    old_data = {c.name: getattr(lesson, c.name) for c in lesson.__table__.columns}

    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lesson, key, value)

    await db.flush()
    await db.refresh(lesson)

    # 审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, "update", "lesson", lesson_id, old_value=old_data, new_value=update_data)

    await db.commit()
    return lesson


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """软删除关卡"""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="关卡不存在")

    # 软删除
    lesson.is_active = False

    # 审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, "delete", "lesson", lesson_id)

    await db.commit()
    return {"message": "已删除"}


@router.post("/lessons/{lesson_id}/publish")
async def toggle_publish(
    lesson_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """发布/下架关卡"""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="关卡不存在")

    lesson.is_active = not lesson.is_active
    action = "publish" if lesson.is_active else "unpublish"

    # 审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, action, "lesson", lesson_id)

    await db.commit()
    return {"message": f"已{'发布' if action == 'publish' else '下架'}"}
