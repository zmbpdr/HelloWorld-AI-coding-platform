"""演示数据库种子 — 创建预置用户及学习数据，方便答辩演示。

创建一个演示用户（demo/demo123），包含：
- 诊断结果（60 分，intermediate 等级）
- 8 个知识点的掌握度数据
- 4 个已完成课程 + 1 个进行中的课程进度和提交记录
- 3 条错题记录（syntax / logic / boundary）
- 1 个已解锁的成就（first-blood）
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import async_session
from app.models.user import User
from app.models.lesson import Lesson
from app.models.progress import Progress
from app.models.submission import Submission
from app.models.enums import SubmissionStatus, ProgressStatus
from app.models.diagnostic import UserDiagnostic
from app.models.knowledge import UserKnowledge
from app.models.error import UserError
from app.models.achievement import UserAchievement, Achievement
from app.models.enums import Difficulty
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

# 演示用户账号
DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demo123"

# 演示用户的诊断结果
DEMO_DIAGNOSTIC = {
    "score": 60,
    "skill_level": "intermediate",
    "correct_tags": ["变量", "数据类型", "运算符"],
    "weak_tags": ["条件判断", "循环", "列表", "函数", "字典"],
    "recommended_start": "python-04-sum-to",
}

# 演示用户的知识掌握度（供 /progress/knowledge 接口使用）
DEMO_KNOWLEDGE = [
    {"tag": "变量", "mastery": 90.0, "total_attempts": 5, "correct_count": 5},
    {"tag": "数据类型", "mastery": 80.0, "total_attempts": 5, "correct_count": 4},
    {"tag": "运算符", "mastery": 85.0, "total_attempts": 6, "correct_count": 5},
    {"tag": "条件判断", "mastery": 35.0, "total_attempts": 4, "correct_count": 1},
    {"tag": "循环", "mastery": 25.0, "total_attempts": 8, "correct_count": 2},
    {"tag": "列表", "mastery": 55.0, "total_attempts": 3, "correct_count": 2},
    {"tag": "函数", "mastery": 60.0, "total_attempts": 3, "correct_count": 2},
    {"tag": "字典", "mastery": 30.0, "total_attempts": 2, "correct_count": 0},
]

# 演示错题记录（三条不同类型）
DEMO_ERRORS = [
    {
        "lesson_slug": "python-02-variables",
        "error_type": "syntax",
        "error_code": "x = 10\nif x = 5:\n    print(\"x is 5\")",
        "ai_analysis": '{"error_type": "syntax", "message": "条件判断中应使用 == 而非 =，= 是赋值运算符"}',
        "is_resolved": True,
        "fixed_code": "x = 10\nif x == 5:\n    print(\"x is 5\")",
    },
    {
        "lesson_slug": "python-05-loops",
        "error_type": "logic",
        "error_code": "total = 0\nfor i in range(10):  # 本意是累加 1 到 10\n    total += i\nprint(total)  # 输出 45，但预期是 55",
        "ai_analysis": '{"error_type": "logic", "message": "range(10) 生成 0-9，总和为 45。如需累加 1-10 应使用 range(1, 11)"}',
        "is_resolved": False,
    },
    {
        "lesson_slug": "python-04-conditionals",
        "error_type": "boundary",
        "error_code": "def is_adult(age):\n    if age >= 18:\n        return True\n    return False\n# 边界值 age=17 处理正确，但 age=0 未考虑",
        "ai_analysis": '{"error_type": "boundary", "message": "逻辑正确但未处理负数和零的特殊情况，增加参数校验会更健壮"}',
        "is_resolved": False,
    },
]


async def seed_demo_data():
    """创建演示用户及学习数据，幂等（已存在则跳过）。"""
    async with async_session() as session:
        # 检查演示用户是否已存在
        existing = (await session.execute(
            select(User).where(User.username == DEMO_USERNAME)
        )).scalars().first()
        if existing:
            logger.info("演示数据已存在，跳过")
            return
        logger.info("开始创建演示数据...")

        now = datetime.now(timezone.utc)

        # 1. 创建演示用户
        user = User(
            username=DEMO_USERNAME,
            email="demo@helloworld.com",
            hashed_password=get_password_hash(DEMO_PASSWORD),
            level=3,
            xp=245,
            streak_days=5,
            membership="pro",
            last_login_at=now,
            created_at=now - timedelta(days=7),
        )
        session.add(user)
        await session.flush()

        # 2. 创建诊断结果
        diagnostic = UserDiagnostic(
            user_id=user.id,
            **DEMO_DIAGNOSTIC,
        )
        session.add(diagnostic)

        # 3. 创建知识掌握度数据
        for k in DEMO_KNOWLEDGE:
            session.add(UserKnowledge(
                user_id=user.id,
                knowledge_tag=k["tag"],
                mastery=k["mastery"],
                total_attempts=k["total_attempts"],
                correct_count=k["correct_count"],
                last_practice_at=now - timedelta(hours=k["total_attempts"] * 2),
            ))

        # 4. 创建课时进度和提交记录
        # 查询 Python 的所有课程（按 order 排序）
        lessons = (await session.execute(
            select(Lesson)
            .where(Lesson.slug.like("python-%"))
            .order_by(Lesson.order)
        )).scalars().all()
        lesson_map = {l.slug: l for l in lessons}

        # 进度设计：前 4 关已完成，第 5 关进行中，第 6 关 available，其余 locked
        completed_slugs = [
            "python-01-get-age",
            "python-01-hello-world",
            "python-02-add",
            "python-02-variables",
        ]
        in_progress_slug = "python-03-is-adult"

        for i, lesson in enumerate(lessons):
            slug = lesson.slug
            if slug in completed_slugs:
                # 已完成关卡：创建进度和提交记录
                progress = Progress(
                    user_id=user.id,
                    lesson_id=lesson.id,
                    status=ProgressStatus.completed,
                    best_score=100 if slug != "python-02-variables" else 80,
                    attempts=2 if slug in ("python-02-add", "python-02-variables") else 1,
                    completed_at=now - timedelta(days=7 - i),
                )
                session.add(progress)

                session.add(Submission(
                    user_id=user.id,
                    lesson_id=lesson.id,
                    code=f"# {slug} - 用户提交的代码示例",
                    language="python",
                    status=SubmissionStatus.accepted,
                    score=100,
                    execution_time=120 + i * 30,
                ))
            elif slug == in_progress_slug:
                # 进行中关卡
                progress = Progress(
                    user_id=user.id,
                    lesson_id=lesson.id,
                    status=ProgressStatus.in_progress,
                    best_score=60,
                    attempts=3,
                )
                session.add(progress)
            elif slug == "python-04-sum-to":
                # 推荐起点，让它在课程地图上显示 available
                pass
            else:
                # 其余不创建记录，课程地图会显示 locked 或 available
                pass

        # 5. 创建错题记录
        for err_data in DEMO_ERRORS:
            lesson = lesson_map.get(err_data["lesson_slug"])
            if lesson:
                session.add(UserError(
                    user_id=user.id,
                    lesson_id=lesson.id,
                    error_code=err_data["error_code"],
                    error_type=err_data["error_type"],
                    ai_analysis=err_data["ai_analysis"],
                    is_resolved=err_data["is_resolved"],
                    fixed_code=err_data.get("fixed_code"),
                ))

        # 6. 解锁成就
        achievement = (await session.execute(
            select(Achievement).where(Achievement.slug == "first-blood")
        )).scalars().first()
        if achievement:
            session.add(UserAchievement(
                user_id=user.id,
                achievement_id=achievement.id,
                unlocked_at=now - timedelta(days=6),
            ))

        await session.commit()
        logger.info(f"演示数据创建完成，用户: {DEMO_USERNAME}/{DEMO_PASSWORD}")
