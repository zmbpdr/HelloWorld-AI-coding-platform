"""课程/语言模型"""

from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Language(Base):
    """编程语言/课程表"""
    __tablename__ = "languages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, comment="语言名称，如 Python")
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="URL 标识，如 python")
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="语言图标 URL")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="语言简介")
    color: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="主题色")
    difficulty: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="难度: beginner/intermediate/advanced")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序权重")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    lessons = relationship("Lesson", back_populates="language", lazy="selectin")
