"""代码片段收藏模型

存储用户收藏的代码片段，支持按语言、标签分类和快捷检索。
"""
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CodeSnippet(Base):
    """代码片段收藏表"""
    __tablename__ = "code_snippets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="用户 ID")
    title: Mapped[str] = mapped_column(String(120), comment="片段标题")
    code: Mapped[str] = mapped_column(Text, comment="代码内容")
    language: Mapped[str] = mapped_column(String(30), default="python", comment="编程语言")
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="标签列表")
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"), nullable=True, comment="来源关卡 ID")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    user = relationship("User", back_populates="snippets")
