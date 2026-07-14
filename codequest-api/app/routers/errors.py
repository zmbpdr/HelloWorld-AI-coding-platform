"""错题本路由 — 错题列表、统计和标记已解决接口"""

from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.deps import get_current_user
from app.database import get_db
from app.services.error_service import (
    get_user_errors,
    get_error_stats,
    mark_error_resolved,
)
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

router = APIRouter()


class ResolveRequest(BaseModel):
    fixed_code: str | None = None


@router.get("/errors")
async def list_errors(
    type: str = Query(None, description="按类型筛选: syntax/logic/boundary/performance"),
    resolved: bool = Query(None, description="按解决状态筛选: true/false"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的错题列表"""
    errors = await get_user_errors(
        db, current_user.id,
        error_type=type,
        is_resolved=resolved,
        limit=limit,
        offset=offset,
    )
    stats = await get_error_stats(db, current_user.id)
    return {"errors": errors, "stats": stats}


@router.patch("/errors/{error_id}/resolve")
async def resolve_error(
    error_id: int,
    request: ResolveRequest = ResolveRequest(),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将错题标记为已解决"""
    success = await mark_error_resolved(
        db, error_id, current_user.id, request.fixed_code
    )
    if not success:
        raise HTTPException(status_code=404, detail="错题记录不存在")
    return {"message": "已标记为已解决"}