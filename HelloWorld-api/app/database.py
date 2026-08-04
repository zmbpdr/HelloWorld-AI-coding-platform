"""数据库模块 - SQLAlchemy 异步引擎和会话管理

提供异步数据库引擎、会话工厂、ORM 基类以及数据库初始化和关闭函数。
SQLite 下自动启用外键约束以保证引用完整性。
"""

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 创建异步数据库引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.SQL_ECHO,
)

# SQLite 默认不启用外键约束，需要手动开启
# 这确保 ON DELETE CASCADE 和引用完整性检查生效
if settings.DATABASE_URL and "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

# 异步会话工厂
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# 声明式基类
class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""
    pass


async def get_db() -> AsyncSession:
    """获取数据库会话的依赖注入函数

    注意：此依赖不自动提交。路由处理函数需要在有写入操作时显式调用
    await session.commit()，读操作无需提交。
    """
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """初始化数据库 - 创建所有表

    如果数据库中已有表则跳过创建。SQLite 模式下还会自动补充
    因模型更新而缺失的字段（如 membership、ai_usage_today 等）。
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 为已有 SQLite 开发库补齐缺失的字段（无 Alembic 迁移时的兼容方案）
        if settings.DATABASE_URL and "sqlite" in settings.DATABASE_URL:
            columns = (await conn.execute(text("PRAGMA table_info(users)"))).mappings().all()
            names = {column["name"] for column in columns}
            if "membership" not in names:
                await conn.execute(text("ALTER TABLE users ADD COLUMN membership VARCHAR(20) DEFAULT 'free'"))
            if "ai_usage_today" not in names:
                await conn.execute(text("ALTER TABLE users ADD COLUMN ai_usage_today INTEGER DEFAULT 0"))
            if "ai_usage_date" not in names:
                await conn.execute(text("ALTER TABLE users ADD COLUMN ai_usage_date DATE"))

            knowledge_columns = (await conn.execute(
                text("PRAGMA table_info(user_knowledge)")
            )).mappings().all()
            knowledge_column_names = {column["name"] for column in knowledge_columns}
            if "created_at" not in knowledge_column_names:
                # SQLite 无法通过 ALTER TABLE 添加带非常量 CURRENT_TIMESTAMP 默认值的列
                # 已存在的行不需要此审计值，新创建的 ORM 行会通过模型默认值自动填充
                await conn.execute(text("ALTER TABLE user_knowledge ADD COLUMN created_at DATETIME"))


async def close_db() -> None:
    """关闭数据库连接"""
    await engine.dispose()
