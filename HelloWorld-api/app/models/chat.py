"""AI 对话历史模型

存储用户与 AI 助手的对话历史记录，每个用户每节课最多保留一条对话记录。
"""
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ChatHistory(Base):
    """用户 AI 对话历史表 — 每个用户每条对话一个 lesson_id 范围"""
    __tablename__ = "chat_histories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), comment="用户 ID")
    lesson_id: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="关联关卡 ID，null 表示全局对话")
    messages: Mapped[list] = mapped_column(JSON, default=list, comment="对话消息列表 [{role, content}]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), comment="更新时间"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson_chat"),
    )
