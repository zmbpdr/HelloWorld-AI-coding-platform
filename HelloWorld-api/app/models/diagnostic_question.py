"""诊断题库模型 — 教师可自由增删改诊断题，替代硬编码列表"""

from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Integer, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DiagnosticQuestion(Base):
    """诊断题库表"""
    __tablename__ = "diagnostic_questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question: Mapped[str] = mapped_column(Text, comment="题目文本")
    options: Mapped[list] = mapped_column(JSON, comment="选项列表，如 ['A. ...', 'B. ...']")
    answer: Mapped[str] = mapped_column(String(10), comment="正确答案，如 A/B/C/D")
    tag: Mapped[str] = mapped_column(String(50), comment="知识点标签，如 '数据类型'")
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")
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