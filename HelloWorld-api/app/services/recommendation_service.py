"""基于知识掌握度的课程推荐服务。

核心逻辑：找出用户掌握度最低的知识点标签，推荐覆盖这些薄弱知识点的课程。
支持按语言筛选、已完成的课程自动排除，并提供知识点掌握度地图。
"""

from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ProgressStatus
from app.models.knowledge import UserKnowledge
from app.models.lesson import Lesson
from app.models.progress import Progress


# 最大推荐数量
MAX_RECOMMENDATIONS = 3


def build_recommendation_payload(
    lessons: Iterable[Lesson],
    knowledge_rows: Iterable[UserKnowledge],
    completed_lesson_ids: set[int],
) -> dict:
    """从已加载的模型对象构建推荐响应。

    保持排序逻辑纯函数化，便于无数据库环境下的单元测试。
    调用方需要在查询时确保课程属于同一语言（当 UI 要求按语言推荐时）。

    推荐策略：
    1. 过滤掉未激活和已完成的课程
    2. 按语言排序、课时顺序排序
    3. 找出掌握度最低的知识点（weak_tags）
    4. 推荐覆盖薄弱知识点的课程

    Args:
        lessons: 所有课程列表
        knowledge_rows: 用户知识点掌握度记录
        completed_lesson_ids: 已完成的课程 ID 集合

    Returns:
        包含 recommended（推荐列表）、next_normal（下一关）、knowledge_map（知识点地图）的字典
    """
    # 过滤：只保留激活且未完成的课程，按语言和课时排序
    ordered_lessons = sorted(
        (lesson for lesson in lessons if lesson.is_active and lesson.id not in completed_lesson_ids),
        key=lambda lesson: (getattr(lesson.language, "sort_order", 0), lesson.order, lesson.id),
    )
    # 构建知识点掌握度映射
    knowledge = {row.knowledge_tag: float(row.mastery) for row in knowledge_rows}
    knowledge_map = {tag: round(mastery, 1) for tag, mastery in sorted(knowledge.items())}

    # 计算"下一关"（正常顺序的第一个未完成课程）
    next_normal = None
    if ordered_lessons:
        lesson = ordered_lessons[0]
        next_normal = {"lesson_id": lesson.id, "title": lesson.title}

    if not ordered_lessons or not knowledge:
        return {"recommended": [], "next_normal": next_normal, "knowledge_map": knowledge_map}

    # 找出最薄弱的知识点（掌握度最低）
    weakest_mastery = min(knowledge.values())
    weak_tags = {tag for tag, mastery in knowledge.items() if mastery == weakest_mastery}

    # 评分排序：覆盖薄弱知识点的课程排在前面
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

    # 取排名最高的前 N 个推荐
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
    """返回针对用户薄弱知识点的课程推荐以及正常的下一关课程。

    查询所有可用课程（可选按语言筛选）、用户已完成的课程和知识点掌握度，
    然后调用纯函数 build_recommendation_payload 计算推荐结果。

    Args:
        db: 数据库会话
        user_id: 用户 ID
        language_slug: 语言 slug（可选，按语言筛选推荐）

    Returns:
        推荐结果字典，包含 recommended、next_normal、knowledge_map
    """
    # 查询所有可用课程（含语言关联）
    lesson_query = (
        select(Lesson)
        .options(selectinload(Lesson.language))
        .where(Lesson.is_active.is_(True))
    )
    if language_slug:
        lesson_query = lesson_query.where(Lesson.language.has(slug=language_slug, is_active=True))
    lesson_rows = (await db.execute(lesson_query)).scalars().all()
    # 过滤：只保留有关联语言的课程
    lessons = [lesson for lesson in lesson_rows if lesson.language and lesson.language.is_active]

    # 查询用户已完成的课程 ID
    completed_query = select(Progress.lesson_id).where(
        Progress.user_id == user_id,
        Progress.status == ProgressStatus.completed,
    )
    completed_lesson_ids = set((await db.execute(completed_query)).scalars().all())

    # 查询用户知识点掌握度
    knowledge_rows = (await db.execute(
        select(UserKnowledge).where(UserKnowledge.user_id == user_id)
    )).scalars().all()

    return build_recommendation_payload(lessons, knowledge_rows, completed_lesson_ids)
