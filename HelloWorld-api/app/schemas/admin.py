"""管理后台 Pydantic 模型"""

from datetime import datetime, date
from typing import Optional, Any

from pydantic import BaseModel, Field


# === 认证 ===
class AdminLogin(BaseModel):
    """管理员登录"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)


class AdminToken(BaseModel):
    """管理员 JWT 令牌"""
    access_token: str
    token_type: str = "bearer"


class AdminUserResponse(BaseModel):
    """管理员信息"""
    id: int
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# === 仪表盘 ===
class DashboardStats(BaseModel):
    """仪表盘统计数据"""
    today_new_users: int = 0
    today_active_users: int = 0
    today_submissions: int = 0
    today_pass_rate: float = 0
    total_users: int = 0
    total_lessons_completed: int = 0
    total_achievements: int = 0
    total_submissions: int = 0


class DashboardChartPoint(BaseModel):
    """趋势图数据点"""
    date: str
    new_users: int = 0
    active_users: int = 0
    submissions: int = 0


class DashboardChart(BaseModel):
    """趋势图数据"""
    data: list[DashboardChartPoint] = []


# === 课程管理 ===
class AdminLessonCreate(BaseModel):
    """新增关卡"""
    language_id: int
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    content: Optional[str] = None
    order: int = 0
    difficulty: Optional[str] = None
    xp_reward: int = 10
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[list[dict]] = None
    hint: Optional[str] = None
    knowledge_tags: list[str] = Field(..., min_length=1)
    estimated_minutes: Optional[int] = Field(None, ge=1)
    prerequisites: list[str] = Field(default_factory=list)
    is_active: bool = True


class AdminLessonUpdate(BaseModel):
    """编辑关卡 - 所有字段可选"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None
    difficulty: Optional[str] = None
    xp_reward: Optional[int] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[list[dict]] = None
    hint: Optional[str] = None
    language_id: Optional[int] = None
    knowledge_tags: Optional[list[str]] = Field(None, min_length=1)
    estimated_minutes: Optional[int] = Field(None, ge=1)
    prerequisites: Optional[list[str]] = None
    is_active: Optional[bool] = None


class AdminLessonResponse(BaseModel):
    """关卡详情（含完整 test_cases）"""
    id: int
    language_id: int
    title: str
    slug: str
    description: Optional[str] = None
    content: Optional[str] = None
    order: int = 0
    difficulty: Optional[str] = None
    xp_reward: int = 10
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[Any] = None
    hint: Optional[str] = None
    knowledge_tags: Optional[list[str]] = None
    estimated_minutes: Optional[int] = None
    prerequisites: Optional[list[str]] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# === 用户管理 ===
class AdminUserDetail(BaseModel):
    """用户详情（含学习轨迹）"""
    id: int
    username: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    level: int = 1
    xp: int = 0
    streak_days: int = 0
    is_banned: bool = False
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    # 学习轨迹
    progress_summary: list[dict] = []
    recent_submissions: list[dict] = []

    model_config = {"from_attributes": True}


class AdminUserBan(BaseModel):
    """封禁/解封用户"""
    is_banned: bool
    reason: Optional[str] = None


# === 成就管理 ===
class AdminAchievementCreate(BaseModel):
    """新增成就"""
    slug: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon_url: Optional[str] = None
    rarity: str = "common"
    xp_reward: int = 0
    condition_type: Optional[str] = None
    condition_value: Optional[int] = None


class AdminAchievementUpdate(BaseModel):
    """编辑成就"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    rarity: Optional[str] = None
    xp_reward: Optional[int] = None
    condition_type: Optional[str] = None
    condition_value: Optional[int] = None


# === 提交审计 ===
class AdminSubmissionResponse(BaseModel):
    """提交记录详情"""
    id: int
    user_id: int
    lesson_id: int
    code: str
    language: Optional[str] = None
    status: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    score: Optional[int] = None
    execution_time: Optional[int] = None
    memory_used: Optional[int] = None
    ai_feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# === 系统设置 ===
class SystemSettingItem(BaseModel):
    """单个系统配置项"""
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SystemSettingUpdate(BaseModel):
    """更新系统配置"""
    value: str
    reason: Optional[str] = None


# === 题库管理 ===

VALID_QUESTION_TYPES = {
    "single_choice", "multiple_choice", "true_false",
    "fill_blank", "coding", "short_answer",
}


class AdminQuestionCreate(BaseModel):
    """新增题目"""
    language_id: int
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    difficulty: Optional[str] = None
    question_type: str = Field(
        default="coding",
        description="题目类型: single_choice/multiple_choice/true_false/fill_blank/coding/short_answer",
    )
    content: Optional[str] = None
    options: Optional[list[dict]] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    test_cases: Optional[list[dict]] = None
    starter_code: Optional[str] = None
    knowledge_tags: list[str] = Field(default_factory=list)
    order: int = 0
    is_active: bool = True


class AdminQuestionUpdate(BaseModel):
    """编辑题目 — 所有字段可选"""
    language_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    question_type: Optional[str] = None
    content: Optional[str] = None
    options: Optional[list[dict]] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    test_cases: Optional[list[dict]] = None
    starter_code: Optional[str] = None
    knowledge_tags: Optional[list[str]] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class AdminQuestionResponse(BaseModel):
    """题目详情"""
    id: int
    language_id: int
    title: str
    slug: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    question_type: str
    content: Optional[str] = None
    options: Optional[Any] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    test_cases: Optional[Any] = None
    starter_code: Optional[str] = None
    knowledge_tags: Optional[list[str]] = None
    order: int = 0
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
