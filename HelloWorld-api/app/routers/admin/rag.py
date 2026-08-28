"""管理后台 RAG 路由 — 索引管理和检索测试

提供索引状态查看、全量/单篇索引、手动检索测试功能。
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.admin import AdminUser
from app.core.admin_deps import get_current_admin, require_role
from app.services.rag_service import (
    get_index_status,
    index_all_lessons,
    index_lesson,
    delete_lesson_index,
    search,
)

router = APIRouter()


@router.get("/rag/status")
async def rag_status(
    current_admin: AdminUser = Depends(get_current_admin),
):
    """获取 RAG 索引状态"""
    return await get_index_status()


@router.post("/rag/index-all")
async def rag_index_all(
    background_tasks: BackgroundTasks,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """全量索引所有课程（后台任务，避免超时）"""
    async def _run():
        await index_all_lessons(db)

    background_tasks.add_task(_run)
    return {"message": "全量索引已开始，请稍后查看状态"}


@router.post("/rag/index-lesson/{lesson_id}")
async def rag_index_lesson(
    lesson_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """索引单篇课程"""
    count = await index_lesson(lesson_id, db)
    if count == 0:
        raise HTTPException(status_code=404, detail="课程不存在或内容为空")
    return {"message": f"索引完成，共 {count} 块", "chunks": count}


@router.delete("/rag/index-lesson/{lesson_id}")
async def rag_delete_lesson_index(
    lesson_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
):
    """删除指定课程的索引"""
    success = await delete_lesson_index(lesson_id)
    if not success:
        raise HTTPException(status_code=404, detail="索引不存在或删除失败")
    return {"message": "索引已删除"}


@router.get("/rag/search")
async def rag_search(
    q: str = Query(..., min_length=1, description="检索关键词"),
    top_k: int = Query(5, ge=1, le=20, description="返回结果数量"),
    tag: str | None = Query(None, description="知识点标签过滤"),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """检索课程内容（管理端测试用）"""
    results = await search(q, top_k=top_k, tag_filter=tag)
    return {"query": q, "results": results, "count": len(results)}