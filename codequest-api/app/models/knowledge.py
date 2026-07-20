"""知识掌握度模型"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, Float, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserKnowledge(Base):
    """用户知识点掌握度表"""
    __tablename__ = "user_knowledge"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), comment="用户 ID"
    )
    knowledge_tag: Mapped[str] = mapped_column(String(100), comment="知识点标签")
    mastery: Mapped[float] = mapped_column(Float, default=0.0, comment="掌握度 0.0-100.0")
    total_attempts: Mapped[int] = mapped_column(Integer, default=0, comment="总尝试次数")
    correct_count: Mapped[int] = mapped_column(Integer, default=0, comment="正确次数")
    last_practice_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="最后练习时间"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "knowledge_tag", name="uq_user_knowledge_tag"),
    )

    # 关系
    user = relationship("User", back_populates="knowledge")