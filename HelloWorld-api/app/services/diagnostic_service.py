"""能力诊断服务 — 10 道选择题评估用户 Python 基础水平

包含诊断题目数据、答案评分计算、诊断结果的保存与查询。
每位用户最多只有一条诊断记录（user_id 唯一约束）。
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.diagnostic import UserDiagnostic

# 诊断题目（10 道选择题，覆盖 Python 核心知识点）
DIAGNOSTIC_QUESTIONS = [
    {"id": 1, "question": "Python 中 print(type(42)) 的输出是什么？",
     "options": ["A. <class 'int'>", "B. <class 'str'>", "C. 42", "D. int"],
     "answer": "A", "tag": "数据类型"},
    {"id": 2, "question": "以下哪个是正确的变量命名？",
     "options": ["A. 2name", "B. my-name", "C. my_name", "D. class"],
     "answer": "C", "tag": "变量"},
    {"id": 3, "question": "x = 10; x += 5 后 x 的值是？",
     "options": ["A. 10", "B. 5", "C. 15", "D. 105"],
     "answer": "C", "tag": "运算符"},
    {"id": 4, "question": "if x > 10: 中，当 x=10 时条件为？",
     "options": ["A. True", "B. False", "C. None", "D. Error"],
     "answer": "B", "tag": "条件判断"},
    {"id": 5, "question": "for i in range(3): 循环执行几次？",
     "options": ["A. 2次", "B. 3次", "C. 4次", "D. 0次"],
     "answer": "B", "tag": "循环"},
    {"id": 6, "question": "len([1,2,3]) 的返回值是？",
     "options": ["A. 2", "B. 3", "C. 4", "D. [1,2,3]"],
     "answer": "B", "tag": "列表"},
    {"id": 7, "question": "def add(a,b): return a+b 中，add(2,3) 返回？",
     "options": ["A. '23'", "B. 5", "C. 23", "D. None"],
     "answer": "B", "tag": "函数"},
    {"id": 8, "question": "d = {'name': 'Alice'}; print(d['name']) 输出？",
     "options": ["A. name", "B. Alice", "C. {'name': 'Alice'}", "D. Error"],
     "answer": "B", "tag": "字典"},
    {"id": 9, "question": "try...except 的作用是？",
     "options": ["A. 加速代码", "B. 捕获异常", "C. 定义函数", "D. 导入模块"],
     "answer": "B", "tag": "异常处理"},
    {"id": 10, "question": "open('file.txt','r') 中 'r' 表示？",
     "options": ["A. 写入", "B. 读取", "C. 追加", "D. 删除"],
     "answer": "B", "tag": "文件操作"},
]


def calculate_diagnostic_result(answers: list[dict]) -> dict:
    """
    根据用户答案计算诊断结果。

    逐题比对答案，统计正确和错误的知识点标签，
    根据得分划分能力等级（beginner/intermediate/advanced）并推荐学习起点。

    Args:
        answers: 用户答案列表，格式 [{"question_id": 1, "answer": "A"}, ...]

    Returns:
        包含 score, skill_level, correct_tags, weak_tags, recommended_start, message 的字典
    """
    correct_count = 0
    correct_tags: list[str] = []
    weak_tags: list[str] = []

    # 逐题比对，收集正确和错误的知识点
    for a in answers:
        q = next((q for q in DIAGNOSTIC_QUESTIONS if q["id"] == a["question_id"]), None)
        if q:
            if a["answer"] == q["answer"]:
                correct_count += 1
                if q["tag"] not in correct_tags:
                    correct_tags.append(q["tag"])
            else:
                if q["tag"] not in weak_tags:
                    weak_tags.append(q["tag"])

    total = len(DIAGNOSTIC_QUESTIONS)
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
    # 查询是否已有诊断记录
    stmt = select(UserDiagnostic).where(UserDiagnostic.user_id == user_id)
    existing = (await db.execute(stmt)).scalars().first()

    if existing:
        # 更新已有记录，保留 created_at
        existing.score = result["score"]
        existing.skill_level = result["skill_level"]
        existing.correct_tags = result["correct_tags"]
        existing.weak_tags = result["weak_tags"]
        existing.recommended_start = result["recommended_start"]
    else:
        # 创建新记录
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
