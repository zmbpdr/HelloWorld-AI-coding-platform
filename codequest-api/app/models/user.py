"""用户模型"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="用户名")
    email: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True, comment="邮箱")
    hashed_password: Mapped[str] = mapped_column(String(255), comment="密码哈希")
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="头像 URL")
    bio: Mapped[str | None] = mapped_column(Text, nullable=True, comment="个人简介")
    level: Mapped[int] = mapped_column(default=1, comment="用户等级")
    xp: Mapped[int] = mapped_column(default=0, comment="经验值")
    streak_days: Mapped[int] = mapped_column(default=0, comment="连续打卡天数")
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否被封禁")
    banned_reason: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封禁原因")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="最后登录时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), comment="更新时间"
    )

    # 关系 — 级联删除：删除用户时自动清除进度/提交/成就
    progress = relationship("Progress", back_populates="user", lazy="select", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user", lazy="select", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", lazy="select", cascade="all, delete-orphan")
    agent_progress = relationship("AgentProgress", back_populates="user", lazy="select", cascade="all, delete-orphan")
    snippets = relationship("CodeSnippet", back_populates="user", lazy="select", cascade="all, delete-orphan")
