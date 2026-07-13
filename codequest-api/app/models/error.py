"""错题本模型"""
from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserError(Base):
    """错题记录表 — 每次提交失败自动记录一条"""
    __tablename__ = "user_errors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="用户 ID")
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), comment="关卡 ID")
    error_code: Mapped[str] = mapped_column(Text, comment="用户提交的错误代码")
    error_type: Mapped[str] = mapped_column(String(20), comment="错误类型: syntax/logic/boundary/performance")
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True, comment="AI 对错误的分析")
    fixed_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="用户后来通过时的正确代码")
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否已解决")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="errors")
    lesson = relationship("Lesson")
