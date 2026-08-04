"""种子数据服务 - 初始化语言、课时、成就和智能体节点

负责在系统首次部署时初始化基础数据，包括：
- 编程语言（Python/JavaScript/Java/C/C++/TypeScript）
- 各语言的课程关卡（从 JSON 文件加载）
- 成就定义
- 管理员账号
- 智能体工坊的神经元节点（从 JSON 文件加载）
"""
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
    """获取课程 JSON 数据目录的绝对路径"""
    return Path(__file__).resolve().parent.parent.parent.parent / "HelloWorld-content" / "lessons"


def _resolve_agent_dir():
    """获取智能体节点 JSON 数据目录的绝对路径"""
    return Path(__file__).resolve().parent.parent.parent.parent / "HelloWorld-content" / "agent"


LESSONS_DIR = _resolve_lessons_dir()
AGENT_DIR = _resolve_agent_dir()

# 智能体工坊的路线数据配置
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

# 预设的成就定义
ACHIEVEMENTS_DATA = [
    {"slug": "first-blood", "name": "初出茅庐", "description": "完成第1关", "condition_type": "lessons", "condition_value": 1, "rarity": "common"},
    {"slug": "getting-started", "name": "循序渐进", "description": "连续完成5关", "condition_type": "lessons", "condition_value": 5, "rarity": "common"},
    {"slug": "streak-7", "name": "习惯养成", "description": "连续学习7天", "condition_type": "streak", "condition_value": 7, "rarity": "rare"},
]

# 预设的编程语言数据
LANGUAGES_DATA = [
    {"name": "Python", "slug": "python", "icon_url": "/icons/python.svg", "description": "AI与数据科学首选，简洁优雅", "color": "#3776AB", "difficulty": "beginner", "is_active": True, "sort_order": 1},
    {"name": "JavaScript", "slug": "javascript", "icon_url": "/icons/javascript.svg", "description": "Web开发核心语言，全栈必备", "color": "#F7DF1E", "difficulty": "beginner", "is_active": True, "sort_order": 2},
    {"name": "Java", "slug": "java", "icon_url": "/icons/java.svg", "description": "企业级应用主力，校招面试刚需", "color": "#ED8B00", "difficulty": "intermediate", "is_active": True, "sort_order": 3},
    {"name": "C", "slug": "c", "icon_url": "/icons/c.svg", "description": "编程语言基石，CS科班必修", "color": "#555555", "difficulty": "beginner", "is_active": True, "sort_order": 4},
    {"name": "C++", "slug": "cpp", "icon_url": "/icons/cpp.svg", "description": "从C过渡，高性能系统编程", "color": "#00599C", "difficulty": "intermediate", "is_active": True, "sort_order": 5},
    {"name": "TypeScript", "slug": "typescript", "icon_url": "/icons/typescript.svg", "description": "从JS自然过渡，类型安全", "color": "#3178C6", "difficulty": "intermediate", "is_active": True, "sort_order": 6},
]


def _load_lessons_from_json(slug: str) -> list[dict]:
    """从 JSON 文件加载某语言的课程数据

    Args:
        slug: 语言标识（如 python、javascript）

    Returns:
        课程数据列表，文件不存在时返回空列表
    """
    file_path = LESSONS_DIR / f"{slug}.json"
    if not file_path.exists():
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_agent_nodes_from_json(file_name: str) -> list[dict]:
    """从 JSON 文件加载智能体节点数据

    Args:
        file_name: JSON 文件名

    Returns:
        节点数据列表，文件不存在时返回空列表
    """
    file_path = AGENT_DIR / file_name
    if not file_path.exists():
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def seed_database():
    """初始化数据库种子数据

    执行流程：
    1. 初始化编程语言（更新已有语言，添加新语言）
    2. 初始化各语言的课程关卡（从 JSON 加载，更新/添加/停用）
    3. 初始化成就定义
    4. 创建默认管理员账号
    5. 初始化智能体工坊节点（从 JSON 加载，解析前置依赖关系）
    """
    ALL_LANGUAGE_SLUGS = ("python", "javascript", "java", "c", "cpp", "typescript")
    async with async_session() as session:
        # ---- 查询已有语言 ----
        result = await session.execute(select(Language))
        existing = result.scalars().all()
        existing_slugs = {lang.slug for lang in existing}
        lang_map = {lang.slug: lang for lang in existing}

        # 先停用所有旧语言
        for language in existing:
            language.is_active = False

        # 更新或创建语言
        for lang_data in LANGUAGES_DATA:
            if lang_data["slug"] not in existing_slugs:
                language = Language(**lang_data)
                session.add(language)
                await session.flush()
                lang_map[language.slug] = language
            else:
                language = lang_map[lang_data["slug"]]
                for key, value in lang_data.items():
                    setattr(language, key, value)

        # ---- 初始化课程 ----
        exist_lessons_result = await session.execute(select(Lesson).where(Lesson.language_id.in_([lang.id for lang in existing])))
        exist_lessons = {l.slug: l for l in exist_lessons_result.scalars().all()}

        for slug in ALL_LANGUAGE_SLUGS:
            language = lang_map.get(slug)
            if not language:
                continue
            json_lessons = _load_lessons_from_json(slug)
            json_slugs = {l["slug"] for l in json_lessons}

            # 更新或创建课程
            for lesson_data in json_lessons:
                if lesson_data["slug"] in exist_lessons:
                    # 更新已有课程内容
                    existing_lesson = exist_lessons[lesson_data["slug"]]
                    for key in ["title", "description", "content", "order", "difficulty", "xp_reward", "starter_code", "solution_code", "test_cases", "hint", "knowledge_tags", "estimated_minutes", "prerequisites"]:
                        if key in lesson_data:
                            setattr(existing_lesson, key, lesson_data[key])
                else:
                    lesson = Lesson(language_id=language.id, title=lesson_data["title"], slug=lesson_data["slug"], description=lesson_data.get("description"), content=lesson_data.get("content"), order=lesson_data.get("order", 0), difficulty=lesson_data.get("difficulty", "beginner"), xp_reward=lesson_data.get("xp_reward", 10), starter_code=lesson_data.get("starter_code"), solution_code=lesson_data.get("solution_code"), test_cases=lesson_data.get("test_cases"), hint=lesson_data.get("hint"), knowledge_tags=lesson_data.get("knowledge_tags"), estimated_minutes=lesson_data.get("estimated_minutes"), prerequisites=lesson_data.get("prerequisites"))
                    session.add(lesson)

            # JSON 中已移除的旧课程标记为停用（保留用户进度/提交记录）
            for old_slug, old_lesson in exist_lessons.items():
                if old_slug.startswith(slug + "-") and old_slug not in json_slugs:
                    old_lesson.is_active = False

        # ---- 初始化成就 ----
        exist_ach = await session.execute(select(Achievement.slug))
        exist_ach_slugs = set(exist_ach.scalars().all())
        for ach_data in ACHIEVEMENTS_DATA:
            if ach_data["slug"] not in exist_ach_slugs:
                session.add(Achievement(**ach_data))

        # ---- 创建管理员 ----
        admin_result = await session.execute(select(AdminUser).where(AdminUser.username == "admin"))
        if not admin_result.scalars().first():
            admin = AdminUser(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role="admin",
            )
            session.add(admin)

        # ---- 初始化智能体节点 ----
        exist_nodes = await session.execute(select(NeuronNode.slug))
        exist_node_slugs = set(exist_nodes.scalars().all())

        for track_info in AGENT_TRACKS_DATA:
            order_to_id: dict[int, int] = {}
            slug_to_id: dict[str, int] = {}
            nodes_to_update: list[tuple[NeuronNode, list]] = []

            # 创建新节点
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

            # 解析前置依赖（将 order 或 slug 转换为实际的数据库 ID）
            for node, raw_prereqs in nodes_to_update:
                resolved = []
                for p in raw_prereqs:
                    if isinstance(p, int) and p in order_to_id:
                        resolved.append(order_to_id[p])
                    elif isinstance(p, str) and p in slug_to_id:
                        resolved.append(slug_to_id[p])
                node.prerequisites = resolved

        await session.commit()
