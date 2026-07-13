"""成就模型"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Achievement(Base):
    """成就定义表"""
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, comment="成就名称")
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, comment="URL 标识")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="成就描述")
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="成就图标 URL")
    rarity: Mapped[str] = mapped_column(String(20), default="common", comment="稀有度: common/rare/epic/legendary")
    xp_reward: Mapped[int] = mapped_column(Integer, default=0, comment="获得成就奖励的经验值")
    condition_type: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="条件类型: lessons/streak/score/languages")
    condition_value: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="条件数值")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    user_achievements = relationship("UserAchievement", back_populates="achievement", lazy="selectin")


class UserAchievement(Base):
    """用户成就关联表"""
    __tablename__ = "user_achievements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), comment="用户 ID")
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievements.id"), comment="成就 ID")
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="解锁时间"
    )

    # 关系
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")
