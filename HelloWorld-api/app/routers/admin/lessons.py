"""管理后台课程管理路由"""

import os
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.models.lesson import Lesson
from app.schemas.admin import AdminLessonCreate, AdminLessonUpdate, AdminLessonResponse
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


def validate_upload_image(filename: str, content: bytes, max_size: int = 5 * 1024 * 1024) -> bool:
    """校验上传图片的合法性：扩展名、大小和 magic bytes。"""
    if not filename:
        return False
    lower_name = filename.lower()
    if lower_name.endswith(".svg"):
        return False
    if lower_name.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")) is False:
        return False
    if len(content) > max_size:
        return False
    signatures = {
        ".png": b"\x89PNG\r\n\x1a\n",
        ".jpg": b"\xff\xd8\xff",
        ".jpeg": b"\xff\xd8\xff",
        ".gif": b"GIF87a" or b"GIF89a",
        ".webp": b"RIFF",
    }
    for suffix, signature in signatures.items():
        if lower_name.endswith(suffix):
            if suffix == ".webp":
                return content.startswith(signature) and len(content) >= 12 and content[8:12] == b"WEBP"
            if suffix in {".jpg", ".jpeg"}:
                return content.startswith(signature)
            if suffix == ".gif":
                return content.startswith(b"GIF87a") or content.startswith(b"GIF89a")
            return content.startswith(signature)
    return False


async def validate_prerequisites(
    db: AsyncSession,
    language_id: int,
    prerequisites: list[str] | None,
    lesson_id: int | None = None,
) -> None:
    """Ensure admin edits keep prerequisite references inside one language."""
    if not prerequisites:
        return
    result = await db.execute(select(Lesson).where(Lesson.slug.in_(prerequisites)))
    lessons = result.scalars().all()
    found = {lesson.slug: lesson for lesson in lessons}
    missing = [slug for slug in prerequisites if slug not in found]
    if missing:
        raise HTTPException(status_code=422, detail=f"前置关卡不存在: {', '.join(missing)}")
    cross_language = [slug for slug, lesson in found.items() if lesson.language_id != language_id]
    if cross_language:
        raise HTTPException(status_code=422, detail=f"前置关卡必须属于同一语言: {', '.join(cross_language)}")

    if lesson_id is None:
        return

    language_lessons = (
        await db.execute(select(Lesson).where(Lesson.language_id == language_id))
    ).scalars().all()
    current = next((item for item in language_lessons if item.id == lesson_id), None)
    if current is None:
        return

    dependencies = {
        item.slug: list(item.prerequisites or []) for item in language_lessons
    }
    dependencies[current.slug] = list(prerequisites)
    visiting: set[str] = set()
    visited: set[str] = set()

    def has_cycle(slug: str) -> bool:
        if slug in visiting:
            return True
        if slug in visited:
            return False
        visiting.add(slug)
        if any(has_cycle(dependency) for dependency in dependencies.get(slug, [])):
            return True
        visiting.remove(slug)
        visited.add(slug)
        return False

    if any(has_cycle(slug) for slug in dependencies):
        raise HTTPException(status_code=422, detail="前置关卡不能形成循环依赖")


@router.post("/lessons/upload-image")
async def upload_lesson_image(
    file: UploadFile = File(...),
    current_admin: AdminUser = Depends(require_role("editor")),
):
    """上传教师课程图片，保存在 static/uploads 目录下。"""
    content = await file.read()
    if not validate_upload_image(file.filename or "", content):
        raise HTTPException(status_code=400, detail="仅允许 JPG/PNG/GIF/WebP 图片，且大小不超过 5MB，SVG 不允许上传")

    today = datetime.now().strftime("%Y%m%d")
    storage_dir = Path("static/uploads") / today
    storage_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "image.png").suffix.lower() or ".png"
    file_name = f"{uuid4()}{suffix}"
    target = storage_dir / file_name
    target.write_bytes(content)

    return {"url": f"/uploads/{today}/{file_name}"}


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
    await validate_prerequisites(db, data.language_id, data.prerequisites)
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
    # Audit fields are JSON columns; normalise datetimes and other ORM values
    # before writing an edit log, otherwise a valid metadata update can fail
    # during commit with a JSON serialisation error.
    old_data = jsonable_encoder(
        {c.name: getattr(lesson, c.name) for c in lesson.__table__.columns}
    )

    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    target_language_id = update_data.get("language_id", lesson.language_id)
    if "prerequisites" in update_data or "language_id" in update_data:
        await validate_prerequisites(
            db,
            target_language_id,
            update_data.get("prerequisites", lesson.prerequisites or []),
            lesson_id,
        )
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
