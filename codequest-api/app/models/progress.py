"""学习进度模型"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProgressStatus


class Progress(Base):
    """用户学习进度表"""
    __tablename__ = "progress"
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_progress_user_lesson"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="用户 ID")
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), comment="课时 ID")
    status: Mapped[ProgressStatus] = mapped_column(
        String(20), default=ProgressStatus.not_started, comment="学习进度状态"
    )
    best_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="最佳提交代码")
    best_score: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="最佳得分")
    attempts: Mapped[int] = mapped_column(Integer, default=0, comment="尝试次数")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), comment="更新时间"
    )

    # 关系
    user = relationship("User", back_populates="progress")
    lesson = relationship("Lesson", back_populates="progress")
