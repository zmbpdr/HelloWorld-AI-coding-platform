"""课程相关的 Pydantic 模型"""

from typing import Optional
from pydantic import BaseModel, Field


class LanguageResponse(BaseModel):
    """语言列表响应项"""
    id: int
    slug: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    color: Optional[str] = None
    difficulty: Optional[str] = None
    total_lessons: int = 0
    completed_lessons: int = 0
    progress_percent: float = 0

    model_config = {"from_attributes": True}


class LessonBrief(BaseModel):
    """课时简要信息"""
    id: int
    title: str
    slug: str
    difficulty: Optional[str] = None
    order: int = 0
    xp_reward: int = 10
    status: Optional[str] = None  # locked / available / in_progress / completed

    model_config = {"from_attributes": True}


class LanguageDetail(BaseModel):
    """语言详情响应"""
    id: int
    slug: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    color: Optional[str] = None
    difficulty: Optional[str] = None
    lessons: list[LessonBrief] = []

    model_config = {"from_attributes": True}


class SubmitCodeRequest(BaseModel):
    """代码提交请求"""
    code: str = Field(..., min_length=1, max_length=50000, description="提交的代码")


class RecommendedLesson(BaseModel):
    lesson_id: int
    slug: str
    title: str
    reason: str
    matched_tags: list[str]


class NextNormalLesson(BaseModel):
    lesson_id: int
    title: str


class RecommendationResponse(BaseModel):
    recommended: list[RecommendedLesson]
    next_normal: NextNormalLesson | None = None
    knowledge_map: dict[str, float]
