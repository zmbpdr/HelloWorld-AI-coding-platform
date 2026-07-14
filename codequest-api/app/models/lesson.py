"""课时/关卡模型"""

from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Difficulty


class Lesson(Base):
    """课时/关卡表"""
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    language_id: Mapped[int] = mapped_column(ForeignKey("languages.id"), comment="所属语言 ID")
    title: Mapped[str] = mapped_column(String(200), comment="课时标题")
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, comment="URL 标识")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="课时描述")
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="课时教学内容（Markdown）")
    order: Mapped[int] = mapped_column(Integer, default=0, comment="课时排序")
    difficulty: Mapped[Difficulty] = mapped_column(String(20), default=Difficulty.beginner, comment="难度等级")
    xp_reward: Mapped[int] = mapped_column(Integer, default=10, comment="完成奖励经验值")

    # 代码挑战相关
    starter_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="初始代码模板")
    solution_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="参考答案代码")
    test_cases: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="测试用例（JSON 数组）")
    hint: Mapped[str | None] = mapped_column(Text, nullable=True, comment="提示信息")

    # 知识标签（D 负责打标签）
    knowledge_tags: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="知识点标签")
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="预计完成时间（分钟）")
    prerequisites: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="前置关卡 slug 列表")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), comment="更新时间"
    )

    # 关系
    language = relationship("Language", back_populates="lessons")
    progress = relationship("Progress", back_populates="lesson", lazy="selectin")
    submissions = relationship("Submission", back_populates="lesson", lazy="selectin")
