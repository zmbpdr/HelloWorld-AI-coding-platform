"""能力诊断模型"""
from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserDiagnostic(Base):
    """用户能力诊断结果表 — 每个用户只能有一条记录（UNIQUE）"""
    __tablename__ = "user_diagnostics"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, comment="用户 ID")
    score: Mapped[int] = mapped_column(Integer, default=0, comment="正确率 0-100")
    skill_level: Mapped[str] = mapped_column(String(20), default="beginner", comment="能力等级: beginner/intermediate/advanced")
    correct_tags: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="掌握的知识点列表")
    weak_tags: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="薄弱知识点列表")
    recommended_start: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="推荐起始关卡 slug")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="诊断时间"
    )

    user = relationship("User", back_populates="diagnostic")
