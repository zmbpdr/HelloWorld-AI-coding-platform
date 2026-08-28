"""管理后台路由包"""

from app.routers.admin.auth import router as auth_router
from app.routers.admin.dashboard import router as dashboard_router
from app.routers.admin.lessons import router as lessons_router
from app.routers.admin.users import router as users_router
from app.routers.admin.achievements import router as achievements_router
from app.routers.admin.submissions import router as submissions_router
from app.routers.admin.settings import router as settings_router
from app.routers.admin.upload import router as upload_router
from app.routers.admin.questions import router as questions_router
from app.routers.admin.lesson_questions import router as lesson_questions_router
from app.routers.admin.diagnostic import router as diagnostic_router
from app.routers.admin.file_import import router as file_import_router
from app.routers.admin.rag import router as rag_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "lessons_router",
    "users_router",
    "achievements_router",
    "submissions_router",
    "settings_router",
    "upload_router",
    "questions_router",
    "lesson_questions_router",
    "diagnostic_router",
    "file_import_router",
    "rag_router",
]
