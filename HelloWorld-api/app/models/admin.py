"""管理后台数据模型 - 管理员账户、系统配置、审计日志、统计聚合"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdminUser(Base):
    """管理员账户表 - 与用户表隔离，避免普通用户升级漏洞"""
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True, comment="管理员用户名")
    email: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, comment="邮箱")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False, comment="密码哈希")
    role: Mapped[str] = mapped_column(String(20), default="editor", comment="角色: admin/editor/viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="最后登录时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    audit_logs = relationship("ContentAuditLog", back_populates="admin")


class SystemSettings(Base):
    """系统配置表 - KV 存储，替代硬编码"""
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True, comment="配置键")
    value: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置值")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置说明")
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("admin_users.id"), nullable=True, comment="更新者 ID")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), comment="更新时间"
    )


class ContentAuditLog(Base):
    """内容变更审计日志"""
    __tablename__ = "content_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("admin_users.id"), nullable=False, comment="操作管理员 ID")
    action: Mapped[str] = mapped_column(String(20), nullable=False, comment="操作类型: create/update/delete/publish")
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="实体类型: lesson/achievement/language")
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, comment="实体 ID")
    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="变更前值")
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="变更后值")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), comment="创建时间"
    )

    # 关系
    admin = relationship("AdminUser", back_populates="audit_logs")


class UserStatsDaily(Base):
    """用户行为聚合表 - 预计算，避免实时统计拖慢主库"""
    __tablename__ = "user_stats_daily"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, comment="统计日期")
    new_users: Mapped[int] = mapped_column(Integer, default=0, comment="新增用户数")
    active_users: Mapped[int] = mapped_column(Integer, default=0, comment="活跃用户数")
    submissions: Mapped[int] = mapped_column(Integer, default=0, comment="提交次数")
    accepted_submissions: Mapped[int] = mapped_column(Integer, default=0, comment="通过提交数")
    avg_score: Mapped[float] = mapped_column(Float, default=0, comment="平均得分")
