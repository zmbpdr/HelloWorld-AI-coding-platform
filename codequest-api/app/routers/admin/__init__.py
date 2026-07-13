"""管理后台路由包"""

from app.routers.admin.auth import router as auth_router
from app.routers.admin.dashboard import router as dashboard_router
from app.routers.admin.lessons import router as lessons_router
from app.routers.admin.users import router as users_router
from app.routers.admin.achievements import router as achievements_router
from app.routers.admin.submissions import router as submissions_router
from app.routers.admin.settings import router as settings_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "lessons_router",
    "users_router",
    "achievements_router",
    "submissions_router",
    "settings_router",
]
