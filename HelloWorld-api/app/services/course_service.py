"""课程服务 - 语言列表、语言详情、关卡地图"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Language
from app.models.lesson import Lesson
from app.models.progress import Progress
from app.models.enums import ProgressStatus


class CourseService:
    """课程服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_languages(self, user_id: int | None = None) -> list[dict]:
        """获取所有可用语言及用户进度概要"""
        result = await self.db.execute(
            select(Language)
            .where(Language.is_active == True)
            .order_by(Language.sort_order)
            .options(selectinload(Language.lessons))
        )
        languages = result.scalars().all()

        output = []
        for lang in languages:
            total_lessons = len(lang.lessons)
            completed_lessons = 0

            if user_id and total_lessons > 0:
                lesson_ids = [l.id for l in lang.lessons]
                progress_result = await self.db.execute(
                    select(func.count()).select_from(Progress).where(
                        Progress.user_id == user_id,
                        Progress.lesson_id.in_(lesson_ids),
                        Progress.status == ProgressStatus.completed,
                    )
                )
                completed_lessons = progress_result.scalar() or 0

            progress_percent = (
                round(completed_lessons / total_lessons * 100, 1)
                if total_lessons > 0
                else 0.0
            )

            output.append({
                "id": lang.id,
                "slug": lang.slug,
                "name": lang.name,
                "description": lang.description,
                "icon_url": lang.icon_url,
                "color": lang.color,
                "difficulty": lang.difficulty,
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "progress_percent": progress_percent,
            })

        return output

    async def get_language_by_slug(self, slug: str) -> dict | None:
        """获取单个语言详情（含关卡列表，不含解锁状态）"""
        result = await self.db.execute(
            select(Language)
            .where(Language.slug == slug, Language.is_active == True)
            .options(selectinload(Language.lessons))
        )
        lang = result.scalars().first()
        if not lang:
            return None

        lessons = [
            {
                "id": l.id,
                "title": l.title,
                "slug": l.slug,
                "difficulty": l.difficulty,
                "order": l.order,
                "xp_reward": l.xp_reward,
                "status": "available",
            }
            for l in sorted(lang.lessons, key=lambda x: x.order)
        ]

        return {
            "id": lang.id,
            "slug": lang.slug,
            "name": lang.name,
            "description": lang.description,
            "icon_url": lang.icon_url,
            "color": lang.color,
            "difficulty": lang.difficulty,
            "lessons": lessons,
        }

    async def get_language_map(self, slug: str, user_id: int) -> dict | None:
        """获取语言关卡地图（含用户解锁状态）"""
        result = await self.db.execute(
            select(Language)
            .where(Language.slug == slug, Language.is_active == True)
            .options(selectinload(Language.lessons))
        )
        lang = result.scalars().first()
        if not lang:
            return None

        # 获取用户在该语言下所有课时的进度
        lesson_ids = [l.id for l in lang.lessons]
        progress_result = await self.db.execute(
            select(Progress).where(
                Progress.user_id == user_id,
                Progress.lesson_id.in_(lesson_ids),
            )
        )
        progress_map = {p.lesson_id: p for p in progress_result.scalars().all()}

        sorted_lessons = sorted(lang.lessons, key=lambda x: x.order)
        lessons = []
        all_previous_completed = True

        for l in sorted_lessons:
            p = progress_map.get(l.id)
            if p:
                status = p.status if isinstance(p.status, str) else p.status.value
            else:
                # 第一个课时始终可用，后续需前一个完成才解锁
                if l.order == 1 or all_previous_completed:
                    status = "available"
                else:
                    status = "locked"

            if status == "completed":
                all_previous_completed = True
            else:
                all_previous_completed = False

            lessons.append({
                "id": l.id,
                "title": l.title,
                "slug": l.slug,
                "difficulty": l.difficulty,
                "order": l.order,
                "xp_reward": l.xp_reward,
                "status": status,
            })

        return {
            "id": lang.id,
            "slug": lang.slug,
            "name": lang.name,
            "description": lang.description,
            "icon_url": lang.icon_url,
            "color": lang.color,
            "difficulty": lang.difficulty,
            "lessons": lessons,
        }
