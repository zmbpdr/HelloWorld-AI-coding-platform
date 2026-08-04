"""简易内存速率限制器（开发环境，生产环境应使用 Redis）"""
import time
import threading
from collections import defaultdict
from fastapi import HTTPException, Request


class InMemoryRateLimiter:
    """基于滑动窗口的内存速率限制

    为每个标识符（IP 或用户 ID）维护一个请求时间戳列表，
    在窗口时间内超过阈值则拒绝请求。
    """

    def __init__(self, max_requests: int, window_seconds: int = 60):
        # 窗口内允许的最大请求数
        self.max_requests = max_requests
        # 滑动窗口大小（秒）
        self.window_seconds = window_seconds
        # 存储每个标识符的请求时间戳列表
        self._store: dict[str, list[float]] = defaultdict(list)
        # 线程锁，保证并发安全
        self._lock = threading.Lock()

    def _clean(self, key: str, now: float) -> None:
        """清理超过窗口时间范围的旧时间戳"""
        cutoff = now - self.window_seconds
        self._store[key] = [t for t in self._store[key] if t > cutoff]

    def is_allowed(self, key: str) -> bool:
        """检查指定标识符是否允许继续请求

        Args:
            key: 标识符（如 IP 地址、用户 ID）
        Returns:
            True 表示允许通过，False 表示超过限制
        """
        now = time.time()
        with self._lock:
            # 先清理过期的记录
            self._clean(key, now)
            # 检查是否超过阈值
            if len(self._store[key]) >= self.max_requests:
                return False
            # 记录本次请求
            self._store[key].append(now)
            return True

    async def __call__(self, request: Request, identifier: str | None = None):
        """作为 FastAPI 依赖使用"""
        # 如果没有指定标识符，使用客户端 IP + 请求路径作为标识
        if identifier is None:
            client = request.client
            identifier = f"{client.host}:{request.url.path}" if client else request.url.path
        if not self.is_allowed(identifier):
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后重试")


# 预配置的限速器实例
login_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)       # 登录：5次/分钟/IP
register_limiter = InMemoryRateLimiter(max_requests=3, window_seconds=60)     # 注册：3次/分钟/IP
submit_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)      # 提交：10次/分钟/用户
ai_limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60)          # AI 对话：20次/分钟/用户
