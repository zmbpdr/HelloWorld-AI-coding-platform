"""用户相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """用户注册请求"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: Optional[str] = Field(None, max_length=100, description="邮箱")
    password: str = Field(..., min_length=8, max_length=100, description="密码")


class UserLogin(BaseModel):
    """用户登录请求"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    level: int = 1
    xp: int = 0
    streak_days: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """JWT 令牌响应"""
    access_token: str
    token_type: str = "bearer"


class RefreshToken(BaseModel):
    """刷新令牌请求"""
    refresh_token: str = Field(..., description="现有的访问令牌")


class TokenData(BaseModel):
    """JWT 令牌数据"""
    user_id: Optional[int] = None
