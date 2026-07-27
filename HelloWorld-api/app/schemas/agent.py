"""智能体工坊相关的 Pydantic 模型"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EnergyRating(BaseModel):
    """能量评级 - 四维度评分"""
    understanding: int = Field(0, ge=0, le=5, description="理解力")
    implementation: int = Field(0, ge=0, le=5, description="实现力")
    optimization: int = Field(0, ge=0, le=5, description="优化力")
    creativity: int = Field(0, ge=0, le=5, description="创造力")


class NeuronNodeBrief(BaseModel):
    """地图上的节点简要信息"""
    id: int
    title: str
    slug: str
    track: str
    section: Optional[str] = None
    difficulty: Optional[str] = None
    order: int = 0
    xp_reward: int = 10
    prerequisites: list[int] = []
    status: Optional[str] = None
    energy_score: Optional[int] = None

    model_config = {"from_attributes": True}


class NeuronNodeResponse(BaseModel):
    """节点详情"""
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    content: Optional[str] = None
    order: int = 0
    difficulty: Optional[str] = None
    xp_reward: int = 10
    track: str
    section: Optional[str] = None
    starter_code: Optional[str] = None
    hint: Optional[str] = None
    prerequisites: list[int] = []
    energy_levels: Optional[EnergyRating] = None
    status: Optional[str] = None
    energy_score: Optional[int] = None
    energy_detail: Optional[EnergyRating] = None
    best_code: Optional[str] = None
    attempts: int = 0

    model_config = {"from_attributes": True}


class NeuralMapEdge(BaseModel):
    """地图连线"""
    source: int
    target: int


class NeuralMapResponse(BaseModel):
    """神经元网络地图"""
    nodes: list[NeuronNodeBrief]
    edges: list[NeuralMapEdge]


class AgentProgressResponse(BaseModel):
    """用户智能体工坊进度"""
    id: int
    node_id: int
    status: str
    energy_score: Optional[int] = None
    energy_detail: Optional[EnergyRating] = None
    best_code: Optional[str] = None
    attempts: int = 0
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AgentSubmitRequest(BaseModel):
    """提交请求"""
    code: str = Field(..., min_length=1, max_length=50000, description="提交的代码")


class AgentSubmitResult(BaseModel):
    """提交结果"""
    submission_id: str
    status: str
    score: int = 0
    energy: EnergyRating = Field(default_factory=EnergyRating)
    energy_score: int = 0
    stdout: str = ""
    stderr: str = ""
    execution_time: float = 0
    encouragement_message: str = ""
    xp_earned: int = 0
    test_results: list[dict] = []
    ai_analysis: str = ""


class TrackOverview(BaseModel):
    """主线概览"""
    track: str
    name: str
    description: str
    total_nodes: int = 0
    completed_nodes: int = 0
    sections: list[str] = []
