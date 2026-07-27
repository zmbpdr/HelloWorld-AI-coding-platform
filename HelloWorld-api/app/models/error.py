"""错题本模型"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserError(Base):
    """用户错题记录表"""
    __tablename__ = "user_errors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), comment="用户 ID"
    )
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), comment="关联关卡 ID"
    )
    error_code: Mapped[str] = mapped_column(Text, comment="用户提交的错误代码")
    error_type: Mapped[str] = mapped_column(
        String(20), default="logic", comment="错误类型：syntax/logic/boundary/performance"
    )
    ai_analysis: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="AI 错误分析结果（JSON）"
    )
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否已解决")
    fixed_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="修正后的代码")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    user = relationship("User", back_populates="errors")
    lesson = relationship("Lesson")