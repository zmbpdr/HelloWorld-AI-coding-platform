"""简易内存速率限制器（开发环境，生产环境应使用 Redis）"""
import time
import threading
from collections import defaultdict
from fastapi import HTTPException, Request


class InMemoryRateLimiter:
    """基于滑动窗口的内存速率限制"""

    def __init__(self, max_requests: int, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def _clean(self, key: str, now: float) -> None:
        cutoff = now - self.window_seconds
        self._store[key] = [t for t in self._store[key] if t > cutoff]

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            self._clean(key, now)
            if len(self._store[key]) >= self.max_requests:
                return False
            self._store[key].append(now)
            return True

    async def __call__(self, request: Request, identifier: str | None = None):
        """作为 FastAPI 依赖使用"""
        if identifier is None:
            client = request.client
            identifier = f"{client.host}:{request.url.path}" if client else request.url.path
        if not self.is_allowed(identifier):
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后重试")


# 预配置的限速器实例
login_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)       # 5次/分钟/IP
register_limiter = InMemoryRateLimiter(max_requests=3, window_seconds=60)     # 3次/分钟/IP
submit_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)      # 10次/分钟/用户
ai_limiter = InMemoryRateLimiter(max_requests=20, window_seconds=60)          # 20次/分钟/用户
