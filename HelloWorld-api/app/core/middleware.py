"""日志中间件模块"""

import time
import logging

from fastapi import Request, Response

logger = logging.getLogger("HelloWorld")


async def logging_middleware(request: Request, call_next) -> Response:
    """请求日志中间件 - 记录每个请求的方法、路径、耗时和状态码"""
    start_time = time.time()

    # 处理请求
    response = await call_next(request)

    # 计算耗时
    process_time = time.time() - start_time

    # 记录日志
    logger.info(
        f"{request.method} {request.url.path} "
        f"- 状态码: {response.status_code} "
        f"- 耗时: {process_time:.3f}s"
    )

    return response
