"""能力诊断服务 — 10 道选择题评估用户 Python 基础水平

诊断题目从数据库 diagnostic_questions 表中读取，教师可通过管理后台自由增删改。
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.diagnostic import UserDiagnostic
from app.models.diagnostic_question import DiagnosticQuestion


async def get_diagnostic_questions(db: AsyncSession) -> list[dict]:
    """从数据库获取启用的诊断题目（按 order 排序）

    Returns:
        题目列表，每项包含 id, question, options, answer, tag, order
    """
    result = await db.execute(
        select(DiagnosticQuestion)
        .where(DiagnosticQuestion.is_active == True)
        .order_by(DiagnosticQuestion.order)
    )
    questions = result.scalars().all()
    return [
        {
            "id": q.id,
            "question": q.question,
            "options": q.options,
            "answer": q.answer,
            "tag": q.tag,
            "order": q.order,
        }
        for q in questions
    ]


async def calculate_diagnostic_result(answers: list[dict], db: AsyncSession) -> dict:
    """
    根据用户答案计算诊断结果。

    逐题比对答案，统计正确和错误的知识点标签，
    根据得分划分能力等级（beginner/intermediate/advanced）并推荐学习起点。

    Args:
        answers: 用户答案列表，格式 [{"question_id": 1, "answer": "A"}, ...]
        db: 数据库会话

    Returns:
        包含 score, skill_level, correct_tags, weak_tags, recommended_start, message 的字典
    """
    questions = await get_diagnostic_questions(db)
    total = len(questions)

    correct_count = 0
    correct_tags: list[str] = []
    weak_tags: list[str] = []

    # 逐题比对，收集正确和错误的知识点
    for a in answers:
        q = next((q for q in questions if q["id"] == a["question_id"]), None)
        if q:
            if a["answer"] == q["answer"]:
                correct_count += 1
                if q["tag"] not in correct_tags:
                    correct_tags.append(q["tag"])
            else:
                if q["tag"] not in weak_tags:
                    weak_tags.append(q["tag"])

    if total == 0:
        return {
            "score": 0,
            "skill_level": "beginner",
            "correct_tags": [],
            "weak_tags": [],
            "recommended_start": "python-01-hello-world",
            "message": "暂无诊断题目，请联系管理员添加。",
        }

    score = int((correct_count / total) * 100)

    # 根据分数判断能力等级并推荐学习起点
    if score <= 30:
        skill_level = "beginner"
        recommended_start = "python-01-hello-world"
        message = "看起来你刚开始接触编程，没关系！我们从最基础的开始，慢慢来。"
    elif score <= 60:
        skill_level = "beginner"
        recommended_start = "python-03-variables"
        message = "你已经有一些基础了，但还需要巩固。建议跳过最基础的 Hello World 和变量，从条件判断开始。"
    elif score <= 80:
        skill_level = "intermediate"
        recommended_start = "python-08-loops"
        message = "基础掌握得不错！建议直接进入循环和函数的学习。"
    else:
        skill_level = "advanced"
        recommended_start = "python-15-functions"
        message = "你的基础很扎实！建议挑战更高级的内容，也可以尝试其他编程语言。"

    return {
        "score": score,
        "skill_level": skill_level,
        "correct_tags": correct_tags,
        "weak_tags": weak_tags,
        "recommended_start": recommended_start,
        "message": message,
    }


async def save_diagnostic(db: AsyncSession, user_id: int, result: dict) -> UserDiagnostic:
    """
    保存诊断结果（upsert：已存在则更新）。

    因为 user_id 有 UNIQUE 约束，每个用户只能有一条诊断记录。
    更新时保留原始 created_at 不变。

    Args:
        db: 数据库会话
        user_id: 用户 ID
        result: 诊断结果字典

    Returns:
        保存或更新后的 UserDiagnostic 对象
    """
    stmt = select(UserDiagnostic).where(UserDiagnostic.user_id == user_id)
    existing = (await db.execute(stmt)).scalars().first()

    if existing:
        existing.score = result["score"]
        existing.skill_level = result["skill_level"]
        existing.correct_tags = result["correct_tags"]
        existing.weak_tags = result["weak_tags"]
        existing.recommended_start = result["recommended_start"]
    else:
        diagnostic = UserDiagnostic(
            user_id=user_id,
            score=result["score"],
            skill_level=result["skill_level"],
            correct_tags=result["correct_tags"],
            weak_tags=result["weak_tags"],
            recommended_start=result["recommended_start"],
        )
        db.add(diagnostic)

    await db.commit()
    return existing or diagnostic


async def get_diagnostic(db: AsyncSession, user_id: int) -> dict | None:
    """获取用户最新的诊断结果

    Args:
        db: 数据库会话
        user_id: 用户 ID

    Returns:
        诊断结果字典，包含 score、skill_level、correct_tags、weak_tags、recommended_start、created_at；
        如果没有诊断记录则返回 None
    """
    stmt = select(UserDiagnostic).where(UserDiagnostic.user_id == user_id)
    result = (await db.execute(stmt)).scalars().first()
    if not result:
        return None
    return {
        "score": result.score,
        "skill_level": result.skill_level,
        "correct_tags": result.correct_tags,
        "weak_tags": result.weak_tags,
        "recommended_start": result.recommended_start,
        "created_at": result.created_at.isoformat() if result.created_at else None,
    }