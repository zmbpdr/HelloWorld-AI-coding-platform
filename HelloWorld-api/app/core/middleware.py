"""日志中间件模块

记录每个 HTTP 请求的方法、路径、处理耗时和响应状态码，用于监控和调试。
"""

import time
import logging

from fastapi import Request, Response

logger = logging.getLogger("HelloWorld")


async def logging_middleware(request: Request, call_next) -> Response:
    """请求日志中间件 - 记录每个请求的方法、路径、耗时和状态码

    Args:
        request: FastAPI 请求对象
        call_next: 下一个中间件或路由处理函数
    Returns:
        响应对象
    """
    start_time = time.time()

    # 调用下一个中间件/路由处理请求
    response = await call_next(request)

    # 计算请求处理耗时
    process_time = time.time() - start_time

    # 记录请求日志
    logger.info(
        f"{request.method} {request.url.path} "
        f"- 状态码: {response.status_code} "
        f"- 耗时: {process_time:.3f}s"
    )

    return response
