"""FastAPI 应用入口"""

from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import logging_middleware
from app.database import close_db, init_db
from app.services.seed_service import seed_database
from app.services.demo_seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理 - 启动和关闭时执行"""
    # 启动：初始化数据库
    await init_db()
    # 初始化种子数据
    await seed_database()
    # 创建演示数据（幂等，已存在则跳过）
    await seed_demo_data()
    yield
    # 关闭：释放数据库连接
    await close_db()


app = FastAPI(
    title="Hello World API",
    description="Hello World 闯关式 AI 编程学习平台",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# 注册请求日志中间件
app.middleware("http")(logging_middleware)

# 提供 Markdown/教程图片上传的静态资源服务
upload_dir = Path("static/uploads")
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# 注册全局异常处理器
register_exception_handlers(app)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """兜底异常处理 - 记录详细日志，对外返回通用错误"""
    import logging
    logger = logging.getLogger("HelloWorld")
    logger.exception(
        f"未处理异常: {type(exc).__name__}: {exc} "
        f"path={request.url.path} method={request.method} "
        f"client={request.client.host if request.client else 'unknown'}"
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误"},
    )

# 路由注册
from app.routers import auth, courses, lessons, ai, achievements, progress, leaderboard, submissions, agent, snippets, diagnostic, errors, membership
app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(diagnostic.router, prefix="/api/v1", tags=["能力诊断"])
app.include_router(courses.router, prefix="/api/v1", tags=["课程"])
app.include_router(lessons.router, prefix="/api/v1", tags=["课时"])
app.include_router(ai.router, prefix="/api/v1", tags=["AI 助手"])
app.include_router(achievements.router, prefix="/api/v1", tags=["成就"])
app.include_router(progress.router, prefix="/api/v1", tags=["进度"])
app.include_router(leaderboard.router, prefix="/api/v1", tags=["排行榜"])
app.include_router(submissions.router, prefix="/api/v1", tags=["提交记录"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["智能体工坊"])
app.include_router(snippets.router, prefix="/api/v1", tags=["代码收藏"])
app.include_router(errors.router, prefix="/api/v1", tags=["错题本"])
app.include_router(membership.router, prefix="/api/v1", tags=["会员"])

# 管理后台路由
from app.routers.admin import auth_router, dashboard_router, lessons_router, users_router, achievements_router, submissions_router, settings_router
app.include_router(auth_router, prefix="/api/v1/admin", tags=["管理后台-认证"])
app.include_router(dashboard_router, prefix="/api/v1/admin", tags=["管理后台-仪表盘"])
app.include_router(lessons_router, prefix="/api/v1/admin", tags=["管理后台-课程"])
app.include_router(users_router, prefix="/api/v1/admin", tags=["管理后台-用户"])
app.include_router(achievements_router, prefix="/api/v1/admin", tags=["管理后台-成就"])
app.include_router(submissions_router, prefix="/api/v1/admin", tags=["管理后台-提交"])
app.include_router(settings_router, prefix="/api/v1/admin", tags=["管理后台-设置"])


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "service": "Hello World API"}
