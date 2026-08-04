"""管理员后台提交审计路由

提供提交记录的列表查询和详情查看功能，用于管理后台审核。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import AdminUser
from app.models.submission import Submission
from app.schemas.admin import AdminSubmissionResponse
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()


@router.get("/submissions")
async def list_submissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    search: str | None = Query(None, description="按用户名搜索"),
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """获取提交记录列表（支持分页、状态筛选和用户搜索）"""
    from app.services.admin_service import AdminService
    service = AdminService(db)
    return await service.get_submissions_list(page=page, page_size=page_size, status=status, search=search)


@router.get("/submissions/{submission_id}", response_model=AdminSubmissionResponse)
async def get_submission_detail(
    submission_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """获取提交详情"""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="提交记录不存在")
    return submission
