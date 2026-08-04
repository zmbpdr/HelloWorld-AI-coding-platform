"""课程路由 - 语言大厅、课程地图

获取编程语言列表、语言详情及关卡地图（含解锁状态）。
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.course import LanguageResponse, LanguageDetail, LessonBrief
from app.core.deps import get_current_user, get_optional_user
from app.models.user import User
from app.services.course_service import CourseService

router = APIRouter()


@router.get("/languages", response_model=list[LanguageResponse])
async def get_languages(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取所有可用语言及用户进度概要"""
    service = CourseService(db)
    languages_data = await service.get_all_languages(
        user_id=current_user.id if current_user else None
    )
    return [LanguageResponse(**data) for data in languages_data]


@router.get("/languages/{slug}", response_model=LanguageDetail)
async def get_language_detail(slug: str, db: AsyncSession = Depends(get_db)):
    """获取单语言详情"""
    service = CourseService(db)
    data = await service.get_language_by_slug(slug)
    if not data:
        raise HTTPException(status_code=404, detail="语言不存在")

    lesson_briefs = [LessonBrief(**l) for l in data.pop("lessons")]
    return LanguageDetail(**data, lessons=lesson_briefs)


@router.get("/languages/{slug}/map", response_model=LanguageDetail)
async def get_language_map(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取该语言的关卡地图（含解锁状态）

    返回每个关卡的用户进度信息（是否已完成、最佳得分等）。
    """
    service = CourseService(db)
    data = await service.get_language_map(slug, user_id=current_user.id)
    if not data:
        raise HTTPException(status_code=404, detail="语言不存在")

    lesson_briefs = [LessonBrief(**l) for l in data.pop("lessons")]
    return LanguageDetail(**data, lessons=lesson_briefs)
