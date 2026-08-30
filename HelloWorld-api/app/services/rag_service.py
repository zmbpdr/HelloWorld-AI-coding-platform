"""轻量版 RAG 检索：基于课时内容的关键词召回与摘要拼接。

当前项目未引入 ChromaDB / sentence-transformers，故采用数据库中现有 lesson.content
做最小可用实现，便于在不大规模重构的前提下完成 AI 上下文注入。
"""

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[A-Za-z0-9\u4e00-\u9fa5]+", (text or "").lower()))


def _split_content_to_chunks(title: str, content: str) -> list[str]:
    if not content:
        return []
    sections = re.split(r"\n(?=\s*#{1,4}\s)", content)
    chunks: list[str] = []
    for section in sections:
        cleaned = " ".join(section.strip().split())
        if cleaned:
            chunks.append(cleaned)
    if not chunks:
        chunks.append(" ".join(content.split()))
    return chunks[:10]


def _score_chunk(query: str, title: str, chunk: str) -> float:
    query_tokens = _tokenize(query)
    if not query_tokens:
        return 0.0
    title_tokens = _tokenize(title)
    text_tokens = _tokenize(chunk)
    overlap = query_tokens & text_tokens
    title_overlap = query_tokens & title_tokens
    score = len(overlap) * 2 + len(title_overlap) * 3
    if title and title.lower() in (chunk or "").lower():
        score += 5
    return float(score)


async def search_lesson_context(
    db: AsyncSession,
    lesson_id: int | None,
    query: str,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """根据课时 ID 和用户问题，召回最相关教学内容片段。"""
    if lesson_id is None:
        return []

    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalars().first()
    if not lesson or not (lesson.content or lesson.title):
        return []

    chunks = _split_content_to_chunks(lesson.title, lesson.content or "")
    if not chunks:
        return []

    scored: list[tuple[float, str]] = []
    for chunk in chunks:
        score = _score_chunk(query, lesson.title, chunk)
        if score > 0:
            scored.append((score, chunk))

    if not scored:
        return []

    ranked = sorted(scored, key=lambda item: item[0], reverse=True)[:limit]
    results: list[dict[str, Any]] = []
    for score, chunk in ranked:
        snippet = " ".join(chunk.split())
        if len(snippet) > 600:
            snippet = snippet[:600].rstrip() + "..."
        results.append({
            "title": lesson.title,
            "content": snippet,
            "score": round(score, 2),
        })
    return results
