"""智能体工坊模型 - 神经元节点与用户进度"""

from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Difficulty


class NeuronNode(Base):
    """神经元节点（知识点）"""
    __tablename__ = "neuron_nodes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), comment="节点标题")
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, comment="URL 标识")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="节点描述")
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="教学内容（Markdown）")
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序")
    difficulty: Mapped[Difficulty] = mapped_column(String(20), default=Difficulty.beginner, comment="难度等级")
    xp_reward: Mapped[int] = mapped_column(Integer, default=10, comment="完成奖励经验值")

    track: Mapped[str] = mapped_column(String(20), comment="主线: ml/agent/llm/project")
    section: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="篇章")

    starter_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="初始代码模板")
    solution_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="参考答案代码")
    test_cases: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="测试用例（JSON 数组）")
    hint: Mapped[str | None] = mapped_column(Text, nullable=True, comment="提示信息")

    prerequisites: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="前置节点 ID 列表")
    energy_levels: Mapped[dict | None] = mapped_column(
        JSON, nullable=True,
        comment="能量评级: {understanding, implementation, optimization, creativity}",
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    progress = relationship("AgentProgress", back_populates="node", lazy="selectin")


class AgentProgress(Base):
    """用户智能体工坊进度"""
    __tablename__ = "agent_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "node_id", name="uq_agent_progress_user_node"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="用户 ID")
    node_id: Mapped[int] = mapped_column(ForeignKey("neuron_nodes.id"), comment="节点 ID")

    status: Mapped[str] = mapped_column(
        String(20), default="in_progress", comment="状态: in_progress/completed/mastered"
    )
    energy_score: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="总能量 1-5")
    energy_detail: Mapped[dict | None] = mapped_column(
        JSON, nullable=True,
        comment="能量详情: {understanding, implementation, optimization, creativity}",
    )

    best_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="最佳提交代码")
    attempts: Mapped[int] = mapped_column(Integer, default=0, comment="尝试次数")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    user = relationship("User", back_populates="agent_progress")
    node = relationship("NeuronNode", back_populates="progress")
