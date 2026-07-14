"""种子数据服务 - 初始化语言、课时、成就和智能体节点"""
import json, os
from pathlib import Path
from sqlalchemy import select
from app.database import async_session
from app.models.course import Language
from app.models.lesson import Lesson
from app.models.achievement import Achievement
from app.models.admin import AdminUser
from app.models.agent import NeuronNode
from app.core.security import get_password_hash
from app.config import settings

def _resolve_lessons_dir():
    return Path(__file__).resolve().parent.parent.parent.parent / "codequest-content" / "lessons"

def _resolve_agent_dir():
    return Path(__file__).resolve().parent.parent.parent.parent / "codequest-content" / "agent"

LESSONS_DIR = _resolve_lessons_dir()
AGENT_DIR = _resolve_agent_dir()

AGENT_TRACKS_DATA = [
    {"track": "ml", "file": "ml.json"},
    {"track": "agent", "file": "agent_dev.json"},
    {"track": "llm", "file": "llm.json"},
    {"track": "project", "file": "project.json"},
    {"track": "dl", "file": "deep_learning.json"},
    {"track": "nlp", "file": "nlp.json"},
    {"track": "cv", "file": "computer_vision.json"},
    {"track": "rl", "file": "reinforcement_learning.json"},
]

ACHIEVEMENTS_DATA = [
    {"slug": "first-blood", "name": "初出茅庐", "description": "完成第1关", "condition_type": "lessons", "condition_value": 1, "rarity": "common"},
    {"slug": "getting-started", "name": "循序渐进", "description": "连续完成5关", "condition_type": "lessons", "condition_value": 5, "rarity": "common"},
    {"slug": "streak-7", "name": "习惯养成", "description": "连续学习7天", "condition_type": "streak", "condition_value": 7, "rarity": "rare"},
]

# 方案C：6种语言全部完整开发
LANGUAGES_DATA = [
    {"name": "Python", "slug": "python", "icon_url": "/icons/python.svg", "description": "AI与数据科学首选，简洁优雅", "color": "#3776AB", "difficulty": "beginner", "is_active": True, "sort_order": 1},
    {"name": "JavaScript", "slug": "javascript", "icon_url": "/icons/javascript.svg", "description": "Web开发核心语言，全栈必备", "color": "#F7DF1E", "difficulty": "beginner", "is_active": True, "sort_order": 2},
    {"name": "Java", "slug": "java", "icon_url": "/icons/java.svg", "description": "企业级应用主力，校招面试刚需", "color": "#ED8B00", "difficulty": "intermediate", "is_active": True, "sort_order": 3},
    {"name": "C", "slug": "c", "icon_url": "/icons/c.svg", "description": "编程语言基石，CS科班必修", "color": "#555555", "difficulty": "beginner", "is_active": True, "sort_order": 4},
    {"name": "C++", "slug": "cpp", "icon_url": "/icons/cpp.svg", "description": "从C过渡，高性能系统编程", "color": "#00599C", "difficulty": "intermediate", "is_active": True, "sort_order": 5},
    {"name": "TypeScript", "slug": "typescript", "icon_url": "/icons/typescript.svg", "description": "从JS自然过渡，类型安全", "color": "#3178C6", "difficulty": "intermediate", "is_active": True, "sort_order": 6},
]

def _load_lessons_from_json(slug: str) -> list[dict]:
    file_path = LESSONS_DIR / f"{slug}.json"
    if not file_path.exists():
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def _load_agent_nodes_from_json(file_name: str) -> list[dict]:
    file_path = AGENT_DIR / file_name
    if not file_path.exists():
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

async def seed_database():
    ALL_LANGUAGE_SLUGS = ("python", "javascript", "java", "c", "cpp", "typescript")
    async with async_session() as session:
        result = await session.execute(select(Language))
        existing = result.scalars().all()
        existing_slugs = {lang.slug for lang in existing}
        lang_map = {lang.slug: lang for lang in existing}
        for lang_data in LANGUAGES_DATA:
            if lang_data["slug"] not in existing_slugs:
                language = Language(**lang_data)
                session.add(language)
                await session.flush()
                lang_map[language.slug] = language
        exist_lessons = await session.execute(select(Lesson.slug))
        exist_lesson_slugs = set(exist_lessons.scalars().all())
        for slug in ALL_LANGUAGE_SLUGS:
            language = lang_map.get(slug)
            if not language:
                continue
            for lesson_data in _load_lessons_from_json(slug):
                if lesson_data["slug"] in exist_lesson_slugs:
                    continue
                lesson = Lesson(language_id=language.id, title=lesson_data["title"], slug=lesson_data["slug"], description=lesson_data.get("description"), content=lesson_data.get("content"), order=lesson_data.get("order", 0), difficulty=lesson_data.get("difficulty", "beginner"), xp_reward=lesson_data.get("xp_reward", 10), starter_code=lesson_data.get("starter_code"), solution_code=lesson_data.get("solution_code"), test_cases=lesson_data.get("test_cases"), hint=lesson_data.get("hint"), knowledge_tags=lesson_data.get("knowledge_tags"), estimated_minutes=lesson_data.get("estimated_minutes"), prerequisites=lesson_data.get("prerequisites"))
                session.add(lesson)
        exist_ach = await session.execute(select(Achievement.slug))
        exist_ach_slugs = set(exist_ach.scalars().all())
        for ach_data in ACHIEVEMENTS_DATA:
            if ach_data["slug"] not in exist_ach_slugs:
                session.add(Achievement(**ach_data))
        admin_result = await session.execute(select(AdminUser).where(AdminUser.username == "admin"))
        if not admin_result.scalars().first():
            admin = AdminUser(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role="admin",
            )
            session.add(admin)
        exist_nodes = await session.execute(select(NeuronNode.slug))
        exist_node_slugs = set(exist_nodes.scalars().all())
        for track_info in AGENT_TRACKS_DATA:
            order_to_id: dict[int, int] = {}
            slug_to_id: dict[str, int] = {}
            nodes_to_update: list[tuple[NeuronNode, list]] = []
            for node_data in _load_agent_nodes_from_json(track_info["file"]):
                if node_data["slug"] in exist_node_slugs:
                    continue
                raw_prereqs = node_data.get("prerequisites") or []
                node = NeuronNode(title=node_data["title"], slug=node_data["slug"], description=node_data.get("description"), content=node_data.get("content"), order=node_data.get("order", 0), difficulty=node_data.get("difficulty", "beginner"), xp_reward=node_data.get("xp_reward", 10), track=node_data["track"], section=node_data.get("section"), starter_code=node_data.get("starter_code"), solution_code=node_data.get("solution_code"), test_cases=node_data.get("test_cases"), hint=node_data.get("hint"), prerequisites=[], energy_levels=node_data.get("energy_levels"), is_active=True)
                session.add(node)
                await session.flush()
                order_to_id[node_data.get("order", 0)] = node.id
                slug_to_id[node_data["slug"]] = node.id
                if raw_prereqs:
                    nodes_to_update.append((node, raw_prereqs))
            # Translate prerequisites (order-int or slug-str) to actual DB IDs
            for node, raw_prereqs in nodes_to_update:
                resolved = []
                for p in raw_prereqs:
                    if isinstance(p, int) and p in order_to_id:
                        resolved.append(order_to_id[p])
                    elif isinstance(p, str) and p in slug_to_id:
                        resolved.append(slug_to_id[p])
                node.prerequisites = resolved
        await session.commit()
