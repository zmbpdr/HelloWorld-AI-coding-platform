"""教程-题目关联模型

多对多关联表：lesson_questions（lesson_id, question_id, order）
用于将题库题目关联到教程关卡，学生端可在关卡内查看关联题目。
"""

from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LessonQuestion(Base):
    """教程-题目关联表（多对多）"""
    __tablename__ = "lesson_questions"
    __table_args__ = (
        UniqueConstraint("lesson_id", "question_id", name="uq_lesson_question"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), index=True, comment="教程（关卡）ID"
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True, comment="题目 ID"
    )
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序")