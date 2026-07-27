"""全局异常处理模块"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class AppException(Exception):
    """应用业务异常基类"""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code


class NotFoundException(AppException):
    """资源未找到异常"""

    def __init__(self, message: str = "资源未找到"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedException(AppException):
    """未授权异常"""

    def __init__(self, message: str = "未授权访问"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    """禁止访问异常"""

    def __init__(self, message: str = "禁止访问"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class BadRequestException(AppException):
    """请求参数错误异常"""

    def __init__(self, message: str = "请求参数错误"):
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST)


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器到 FastAPI 应用"""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """处理所有应用业务异常"""
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )
