"""应用配置模块 - 使用 pydantic-settings 管理所有配置项

支持从 .env 文件和环境变量加载配置，提供默认开发环境值。
生产环境应通过环境变量覆盖默认值，尤其是 SECRET_KEY。
"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings

# 项目根目录（HelloWorld-api/）
_APP_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """应用全局配置

    所有配置项均在构造时从 .env 文件或环境变量中读取。
    """

    # --- 数据库 ---
    DATABASE_URL: str = "sqlite+aiosqlite:///./HelloWorld.db"

    # --- Redis ---
    REDIS_URL: str = "redis://localhost:6379"

    # --- JWT ---
    SECRET_KEY: str = "change-me-in-production"    # 生产环境必须修改
    ALGORITHM: str = "HS256"                       # 加密算法
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30          # 令牌过期时间（分钟）

    # --- AI 服务 ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"   # Ollama 本地大模型
    DEEPSEEK_API_KEY: Optional[str] = None            # DeepSeek API 密钥
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"         # DeepSeek 模型名
    AI_PROVIDER_PRIORITY: str = "deepseek,ollama,mock"# AI 提供器优先级

    # --- 管理后台 ---
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@helloworld.com"
    ADMIN_PASSWORD: str = "admin123"

    # --- CORS ---
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # --- 文件上传 ---
    UPLOAD_DIR: str = str(_APP_DIR / "static" / "uploads")   # 图片上传存储目录
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024                   # 上传文件大小限制（默认 5MB）

    # --- 执行环境 ---
    ALLOW_DIRECT_EXECUTION: bool = False     # 允许宿主机直接执行代码（仅开发环境）
    CONTENT_DIR: str = ""                    # 课程内容 JSON 文件目录

    # --- 调试 ---
    SQL_ECHO: bool = False                   # SQL 日志输出

    # --- 功能开关 ---
    FEATURE_DIAGNOSTIC: bool = True
    FEATURE_KNOWLEDGE: bool = True
    FEATURE_ERROR_BOOK: bool = True
    FEATURE_STRUCTURED_REVIEW: bool = True
    FEATURE_RECOMMEND: bool = True
    FEATURE_WEEKLY_REPORT: bool = False
    FEATURE_MEMBERSHIP: bool = True
    FREE_DAILY_AI_QUOTA: int = 5            # 免费用户每日 AI 使用次数

    model_config = {"env_file": str(_APP_DIR / ".env"), "env_file_encoding": "utf-8"}


# 全局配置单例
settings = Settings()

# 自动修正数据库路径：始终指向 HelloWorld-api/ 目录下的 HelloWorld.db
_DB_PATH = str(_APP_DIR / "HelloWorld.db")
if "sqlite" in settings.DATABASE_URL:
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{_DB_PATH}"

# 生产环境启动检查 — 提醒修改默认密钥
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
