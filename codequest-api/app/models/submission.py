"""代码提交模型"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text, ForeignKey, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import SubmissionStatus


class Submission(Base):
    """代码提交记录表"""
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="用户 ID")
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), comment="课时 ID")
    code: Mapped[str] = mapped_column(Text, comment="提交的代码")
    language: Mapped[str] = mapped_column(String(50), comment="编程语言")
    status: Mapped[SubmissionStatus] = mapped_column(
        String(20), default=SubmissionStatus.pending, comment="提交状态"
    )
    stdout: Mapped[str | None] = mapped_column(Text, nullable=True, comment="标准输出")
    stderr: Mapped[str | None] = mapped_column(Text, nullable=True, comment="标准错误输出")
    score: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="得分")
    execution_time: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="执行耗时（毫秒）")
    memory_used: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="内存占用（KB）")
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True, comment="AI 反馈")
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="提交时间"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    user = relationship("User", back_populates="submissions")
    lesson = relationship("Lesson", back_populates="submissions")
