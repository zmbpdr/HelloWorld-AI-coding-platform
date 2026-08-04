"""通用枚举类型

定义系统中使用的各种枚举常量，包括难度等级、提交状态和学习进度状态。
"""

from enum import Enum


class Difficulty(str, Enum):
    """难度等级枚举"""
    beginner = "beginner"           # 初级
    intermediate = "intermediate"   # 中级
    advanced = "advanced"           # 高级


class SubmissionStatus(str, Enum):
    """代码提交状态枚举"""
    pending = "pending"     # 待评测
    accepted = "accepted"   # 通过
    wrong = "wrong"         # 答案错误
    error = "error"         # 运行错误
    timeout = "timeout"     # 超时


class ProgressStatus(str, Enum):
    """学习进度状态枚举"""
    not_started = "not_started"  # 未开始
    in_progress = "in_progress"  # 进行中
    completed = "completed"      # 已完成
