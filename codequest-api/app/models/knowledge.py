"""知识掌握度模型"""
from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserKnowledge(Base):
    """知识点掌握度表 — 每个用户每个知识点一条记录，联合唯一"""
    __tablename__ = "user_knowledge"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="用户 ID")
    knowledge_tag: Mapped[str] = mapped_column(String(50), comment="知识点标签，如'循环'、'函数'")
    mastery: Mapped[float] = mapped_column(Float, default=0.0, comment="掌握度 0.0-100.0")
    total_attempts: Mapped[int] = mapped_column(Integer, default=0, comment="总尝试次数")
    correct_count: Mapped[int] = mapped_column(Integer, default=0, comment="正确次数")
    last_practice_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="最近练习时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="knowledge")

    __table_args__ = (
        UniqueConstraint("user_id", "knowledge_tag", name="uq_user_knowledge"),
    )
