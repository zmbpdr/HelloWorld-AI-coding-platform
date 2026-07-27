"""能力诊断模型"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserDiagnostic(Base):
    """用户能力诊断结果表"""
    __tablename__ = "user_diagnostics"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, comment="用户 ID（每个用户仅一条记录）"
    )
    score: Mapped[int] = mapped_column(Integer, default=0, comment="诊断得分（0-100）")
    skill_level: Mapped[str] = mapped_column(
        String(20), default="beginner", comment="能力等级：beginner/intermediate/advanced"
    )
    correct_tags: Mapped[list] = mapped_column(JSON, default=list, comment="掌握的知识点标签")
    weak_tags: Mapped[list] = mapped_column(JSON, default=list, comment="薄弱的知识点标签")
    recommended_start: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="推荐起始关卡 slug"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    user = relationship("User", back_populates="diagnostic")