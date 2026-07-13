"""通用枚举类型"""

from enum import Enum


class Difficulty(str, Enum):
    """难度等级"""
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class SubmissionStatus(str, Enum):
    """代码提交状态"""
    pending = "pending"
    accepted = "accepted"
    wrong = "wrong"
    error = "error"
    timeout = "timeout"


class ProgressStatus(str, Enum):
    """学习进度状态"""
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"
