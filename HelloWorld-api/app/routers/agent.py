"""智能体工坊路由 - 神经元网络地图、节点详情、代码提交、进度查询"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.agent import AgentSubmitRequest
from app.core.deps import get_current_user
from app.services.agent_service import AgentService

router = APIRouter()


@router.get("/map")
async def get_neural_map(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取神经元网络地图（所有节点 + 连线 + 用户进度）"""
    service = AgentService(db)
    return await service.get_neural_map(current_user.id)


@router.get("/nodes/{node_id}")
async def get_node_detail(
    node_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取节点详情"""
    service = AgentService(db)
    result = await service.get_node_detail(node_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="节点不存在")
    return result


@router.post("/nodes/{node_id}/submit")
async def submit_code(
    node_id: int,
    request: AgentSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交代码评测"""
    service = AgentService(db)
    result = await service.submit_and_judge(current_user.id, node_id, request.code)
    if result.get("message"):
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
    await db.commit()
    return result


@router.get("/progress")
async def get_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户所有进度"""
    service = AgentService(db)
    return await service.get_user_progress(current_user.id)


@router.get("/tracks")
async def get_tracks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取8条主线概览"""
    service = AgentService(db)
    return await service.get_tracks_overview(current_user.id)
