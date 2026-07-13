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
