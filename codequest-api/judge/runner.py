"""评测执行器 - 数据结构和语言配置（实际评测逻辑在 app.services.judge_service）

语言命令配置已迁移至 app.judge.language_config，此处仅保留 JudgeResult 数据类。
"""

from dataclasses import dataclass


@dataclass
class JudgeResult:
    """评测结果"""
    passed: bool
    output: str
    error: str | None = None
    execution_time: int = 0  # 毫秒
    test_results: list[dict] | None = None
