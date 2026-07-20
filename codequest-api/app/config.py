"""应用配置模块 - 使用 pydantic-settings 管理所有配置项"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings

_APP_DIR = Path(__file__).resolve().parent.parent  # codequest-api/


class Settings(BaseSettings):
    """应用全局配置"""

    # 数据库连接地址（默认使用 aiosqlite 开发数据库）
    DATABASE_URL: str = "sqlite+aiosqlite:///./codequest.db"

    # Redis 连接地址
    REDIS_URL: str = "redis://localhost:6379"

    # JWT 密钥
    SECRET_KEY: str = "change-me-in-production"

    # JWT 加密算法
    ALGORITHM: str = "HS256"

    # 访问令牌过期时间（分钟）
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Ollama 本地大模型服务地址
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # DeepSeek API 密钥（可选）
    DEEPSEEK_API_KEY: Optional[str] = None

    # DeepSeek 模型名称
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"

    # AI 提供器优先级
    AI_PROVIDER_PRIORITY: str = "deepseek,ollama,mock"

    # 管理员账号
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@helloworld.com"
    ADMIN_PASSWORD: str = "admin123"

    # CORS 允许的来源列表
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # 允许宿主机直接执行代码（仅开发环境，生产环境必须为 False）
    ALLOW_DIRECT_EXECUTION: bool = False

    # 课程内容数据目录路径（JSON 课时文件所在目录）
    CONTENT_DIR: str = ""

    # SQL 日志输出（开发环境开启，生产环境关闭）
    SQL_ECHO: bool = False

    # 功能开关（降级策略）
    FEATURE_DIAGNOSTIC: bool = True
    FEATURE_KNOWLEDGE: bool = True
    FEATURE_ERROR_BOOK: bool = True
    FEATURE_STRUCTURED_REVIEW: bool = True
    FEATURE_RECOMMEND: bool = True
    FEATURE_WEEKLY_REPORT: bool = False
    FEATURE_MEMBERSHIP: bool = True
    FREE_DAILY_AI_QUOTA: int = 5

    model_config = {"env_file": str(_APP_DIR / ".env"), "env_file_encoding": "utf-8"}


# 全局配置单例
settings = Settings()

# 自动修正数据库路径：始终指向 codequest-api/ 目录下的 codequest.db
_DB_PATH = str(_APP_DIR / "codequest.db")
if "sqlite" in settings.DATABASE_URL:
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{_DB_PATH}"

# 生产环境启动检查
import logging
logger = logging.getLogger(__name__)
if settings.SECRET_KEY == "change-me-in-production":
    logger.warning(
        "\n"
        "=====================================================\n"
        "  WARNING: SECRET_KEY 仍为默认值。\n"
        "  此设置仅适用于本地开发。\n"
        "  生产环境请务必设置强随机 SECRET_KEY 环境变量。\n"
        "=====================================================\n"
    )
