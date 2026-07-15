"""基于知识掌握度的课程推荐服务。"""
from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ProgressStatus
from app.models.knowledge import UserKnowledge
from app.models.lesson import Lesson
from app.models.progress import Progress


MAX_RECOMMENDATIONS = 3


def build_recommendation_payload(
    lessons: Iterable[Lesson],
    knowledge_rows: Iterable[UserKnowledge],
    completed_lesson_ids: set[int],
) -> dict:
    """Build a response payload from already-loaded models.

    Keeping ranking logic pure makes the fallback and matching rules easy to
    test without a database. Callers must supply lessons from one language when
    the UI asks for a language-scoped recommendation.
    """
    ordered_lessons = sorted(
        (lesson for lesson in lessons if lesson.is_active and lesson.id not in completed_lesson_ids),
        key=lambda lesson: (getattr(lesson.language, "sort_order", 0), lesson.order, lesson.id),
    )
    knowledge = {row.knowledge_tag: float(row.mastery) for row in knowledge_rows}
    knowledge_map = {tag: round(mastery, 1) for tag, mastery in sorted(knowledge.items())}
    next_normal = None
    if ordered_lessons:
        lesson = ordered_lessons[0]
        next_normal = {"lesson_id": lesson.id, "title": lesson.title}

    if not ordered_lessons or not knowledge:
        return {"recommended": [], "next_normal": next_normal, "knowledge_map": knowledge_map}

    weakest_mastery = min(knowledge.values())
    weak_tags = {tag for tag, mastery in knowledge.items() if mastery == weakest_mastery}
    ranked: list[tuple[float, int, int, Lesson, list[str]]] = []
    for lesson in ordered_lessons:
        matched_tags = [tag for tag in (lesson.knowledge_tags or []) if tag in weak_tags]
        if matched_tags:
            ranked.append((
                min(knowledge[tag] for tag in matched_tags),
                getattr(lesson.language, "sort_order", 0),
                lesson.order,
                lesson,
                matched_tags,
            ))

    recommended = []
    for _, _, _, lesson, matched_tags in sorted(ranked)[:MAX_RECOMMENDATIONS]:
        tags_text = "、".join(matched_tags)
        recommended.append({
            "lesson_id": lesson.id,
            "slug": lesson.slug,
            "title": lesson.title,
            "reason": f"覆盖薄弱知识点: {tags_text}",
            "matched_tags": matched_tags,
        })
    return {"recommended": recommended, "next_normal": next_normal, "knowledge_map": knowledge_map}


async def get_recommendation(
    db: AsyncSession,
    user_id: int,
    language_slug: str | None = None,
) -> dict:
    """Return weak-knowledge recommendations and the normal next lesson."""
    lesson_query = (
        select(Lesson)
        .options(selectinload(Lesson.language))
        .where(Lesson.is_active.is_(True))
    )
    if language_slug:
        lesson_query = lesson_query.where(Lesson.language.has(slug=language_slug, is_active=True))
    lesson_rows = (await db.execute(lesson_query)).scalars().all()
    lessons = [lesson for lesson in lesson_rows if lesson.language and lesson.language.is_active]

    completed_query = select(Progress.lesson_id).where(
        Progress.user_id == user_id,
        Progress.status == ProgressStatus.completed,
    )
    completed_lesson_ids = set((await db.execute(completed_query)).scalars().all())
    knowledge_rows = (await db.execute(
        select(UserKnowledge).where(UserKnowledge.user_id == user_id)
    )).scalars().all()
    return build_recommendation_payload(lessons, knowledge_rows, completed_lesson_ids)
