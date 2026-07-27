"""AI对话相关的 Pydantic 模型"""

from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """AI聊天请求"""
    message: str = Field(..., min_length=1, description="用户消息")
    context: Optional[dict] = None  # 可包含 lesson_title, code, error


class ChatResponse(BaseModel):
    """AI聊天响应"""
    reply: str = Field(..., description="AI回复内容")


class AIActionRequest(BaseModel):
    """四模式 AI 请求（诊断/导师/审查/规划）"""
    code: str = Field(..., min_length=1, description="用户代码")
    lesson_id: Optional[int] = Field(None, description="关卡 ID")


class ReviewScores(BaseModel):
    correctness: int   # 0-100
    readability: int   # 0-100
    performance: int   # 0-100
    robustness: int    # 0-100


class ReviewIssue(BaseModel):
    line: int
    message: str
    severity: str  # error | warning | info


class ReviewResponse(BaseModel):
    scores: ReviewScores
    issues: list[ReviewIssue] = []
    overall: str


class TutorResponse(BaseModel):
    response: str
