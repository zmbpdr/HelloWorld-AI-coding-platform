"""题库模型

题目类型支持：
- single_choice: 单选题
- multiple_choice: 多选题
- true_false: 判断题
- fill_blank: 填空题
- coding: 编程题
- short_answer: 简答题
"""

from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Difficulty


class Question(Base):
    """题库表"""
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    language_id: Mapped[int] = mapped_column(ForeignKey("languages.id"), comment="所属语言 ID")
    title: Mapped[str] = mapped_column(String(200), comment="题目标题")
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, comment="URL 标识")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="题目描述（题干摘要）")
    difficulty: Mapped[Difficulty] = mapped_column(
        String(20), default=Difficulty.beginner, comment="难度等级"
    )
    question_type: Mapped[str] = mapped_column(
        String(20), default="coding",
        comment="题目类型: single_choice/multiple_choice/true_false/fill_blank/coding/short_answer"
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="题目内容（Markdown）")
    options: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="选项列表（选择题适用）")
    answer: Mapped[str | None] = mapped_column(Text, nullable=True, comment="正确答案")
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True, comment="答案解析")
    test_cases: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="测试用例（编程题适用）")
    starter_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="初始代码模板")
    knowledge_tags: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="知识点标签")
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        comment="更新时间",
    )

    # 关系
    language = relationship("Language")