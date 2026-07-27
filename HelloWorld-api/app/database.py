"""数据库模块 - SQLAlchemy 异步引擎和会话管理"""

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 创建异步引擎
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
    """初始化数据库 - 创建所有表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 本项目尚未维护历史 Alembic revision；为已有 SQLite 开发库补齐会员字段。
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
                # SQLite cannot add a non-constant CURRENT_TIMESTAMP default
                # through ALTER TABLE. Existing rows do not require this audit
                # value, while all newly-created ORM rows receive the model default.
                await conn.execute(text("ALTER TABLE user_knowledge ADD COLUMN created_at DATETIME"))


async def close_db() -> None:
    """关闭数据库连接"""
    await engine.dispose()
