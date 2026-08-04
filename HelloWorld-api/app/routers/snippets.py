"""代码片段收藏路由

提供用户代码片段的收藏、列表查看、搜索和删除功能。
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.models.snippet import CodeSnippet
from app.core.deps import get_current_user
from pydantic import BaseModel, Field

router = APIRouter()


class CreateSnippetRequest(BaseModel):
    """收藏代码片段请求体"""
    title: str = Field(..., min_length=1, max_length=120)
    code: str = Field(..., min_length=1, max_length=10000)
    language: str = "python"
    tags: list[str] = []
    lesson_id: int | None = None


@router.get("/snippets")
async def list_snippets(
    search: str | None = Query(None, description="搜索标题/代码"),
    tag: str | None = Query(None, description="按标签筛选"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户收藏列表"""
    query = select(CodeSnippet).where(CodeSnippet.user_id == current_user.id).order_by(CodeSnippet.created_at.desc())
    result = await db.execute(query)
    snippets = result.scalars().all()

    items = []
    for s in snippets:
        tags = s.tags or []
        if tag and tag not in tags:
            continue
        if search and search.lower() not in s.title.lower() and search not in s.code:
            continue
        items.append({
            "id": s.id, "title": s.title, "code": s.code,
            "language": s.language, "tags": tags,
            "lesson_id": s.lesson_id, "created_at": s.created_at.isoformat(),
        })
    return {"items": items}


@router.post("/snippets")
async def create_snippet(
    req: CreateSnippetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """收藏代码片段"""
    snippet = CodeSnippet(
        user_id=current_user.id, title=req.title, code=req.code,
        language=req.language, tags=req.tags, lesson_id=req.lesson_id,
    )
    db.add(snippet)
    await db.commit()
    return {"id": snippet.id, "message": "收藏成功"}


@router.delete("/snippets/{snippet_id}")
async def delete_snippet(
    snippet_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除收藏"""
    result = await db.execute(select(CodeSnippet).where(CodeSnippet.id == snippet_id, CodeSnippet.user_id == current_user.id))
    snippet = result.scalars().first()
    if not snippet:
        raise HTTPException(404, "片段不存在")
    await db.delete(snippet)
    await db.commit()
    return {"message": "已删除"}
