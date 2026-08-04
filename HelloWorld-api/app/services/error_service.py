"""错题本服务 — 记录用户提交的错误代码，支持错误分类和统计

提供规则分类和 AI 分类两种错误分类方式，支持错题列表查询、
按类型和解决状态筛选、错误统计以及错题标记为已解决等功能。
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.error import UserError


def classify_error_by_rules(stderr: str, score: int, test_results: list | None = None) -> str:
    """
    基于规则判断错误类型（AI 分类失败时的降级方案）。

    分类规则：
    - SyntaxError / IndentationError 等语法错误 → syntax
    - 编译错误 / 运行时错误且 score=0 → syntax
    - score > 0 但 < 100（部分通过）→ logic
    - 超时 → performance
    - IndexError / KeyError 等边界错误 → boundary
    - 其他 → logic

    Args:
        stderr: 标准错误输出
        score: 提交得分
        test_results: 测试结果列表（可选）

    Returns:
        错误类型：syntax / logic / boundary / performance
    """
    stderr_lower = (stderr or "").lower()

    # 语法错误关键词匹配
    syntax_keywords = [
        "syntaxerror", "indentationerror", "taberror",
        "syntax error", "unexpected token", "unexpected eof",
        "expected", "invalid syntax", "cannot assign to",
        "nameerror", "is not defined",
    ]
    for kw in syntax_keywords:
        if kw in stderr_lower:
            return "syntax"

    # 性能/超时
    if "timeout" in stderr_lower or "timed out" in stderr_lower:
        return "performance"

    # 边界错误
    boundary_keywords = [
        "indexerror", "keyerror", "index out of range",
        "out of bounds", "out of range", "overflow",
    ]
    for kw in boundary_keywords:
        if kw in stderr_lower:
            return "boundary"

    # 如果 score > 0 说明部分通过，是逻辑错误
    if score is not None and score > 0 and score < 100:
        return "logic"

    # 有 stderr 但没有匹配到语法关键词 -> 可能是运行时错误
    if stderr and stderr.strip():
        return "syntax"

    return "logic"


async def save_error(
    db: AsyncSession,
    user_id: int,
    lesson_id: int,
    code: str,
    stderr: str = "",
    score: int = 0,
    test_results: list | None = None,
) -> UserError:
    """
    保存错误记录。优先使用 AI 分类，失败时降级到规则分类。

    Args:
        db: 数据库会话
        user_id: 用户 ID
        lesson_id: 课时 ID
        code: 用户提交的错误代码
        stderr: 错误输出
        score: 得分
        test_results: 测试结果列表（可选）

    Returns:
        创建的 UserError 对象
    """
    # 先使用规则分类作为默认值
    ai_analysis = None
    error_type = classify_error_by_rules(stderr, score, test_results)

    # 尝试 AI 分类增强
    try:
        from app.services.ai_service import classify_error_with_ai
        ai_result = await classify_error_with_ai(code, stderr or "", score, test_results)
        if ai_result.get("error_type"):
            error_type = ai_result["error_type"]
        ai_analysis = ai_result.get("analysis")
    except Exception:
        pass  # 降级到规则分类

    # 创建错误记录
    error = UserError(
        user_id=user_id,
        lesson_id=lesson_id,
        error_code=code,
        error_type=error_type,
        ai_analysis=ai_analysis,
        is_resolved=False,
    )
    db.add(error)
    await db.commit()
    return error


async def get_user_errors(
    db: AsyncSession,
    user_id: int,
    error_type: str | None = None,
    is_resolved: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """获取用户错题列表（支持按类型和解决状态筛选）

    Args:
        db: 数据库会话
        user_id: 用户 ID
        error_type: 错误类型筛选（可选）
        is_resolved: 解决状态筛选（可选）
        limit: 返回数量上限（默认 50）
        offset: 分页偏移量

    Returns:
        错题列表，每个元素包含 id、lesson_id、error_type、error_code、ai_analysis、is_resolved、created_at
    """
    query = select(UserError).where(UserError.user_id == user_id)
    if error_type:
        query = query.where(UserError.error_type == error_type)
    if is_resolved is not None:
        query = query.where(UserError.is_resolved == is_resolved)
    query = query.order_by(UserError.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    errors = result.scalars().all()

    return [
        {
            "id": e.id,
            "lesson_id": e.lesson_id,
            "error_type": e.error_type,
            "error_code": e.error_code[:200],  # 截断长代码
            "ai_analysis": e.ai_analysis,
            "is_resolved": e.is_resolved,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in errors
    ]


async def get_error_stats(db: AsyncSession, user_id: int) -> dict:
    """获取用户错误统计（按类型分组计数）

    Args:
        db: 数据库会话
        user_id: 用户 ID

    Returns:
        各错误类型的计数统计字典
    """
    result = await db.execute(
        select(UserError.error_type, func.count(UserError.id))
        .where(UserError.user_id == user_id)
        .group_by(UserError.error_type)
    )
    stats = {"syntax": 0, "logic": 0, "boundary": 0, "performance": 0}
    for error_type, count in result:
        if error_type in stats:
            stats[error_type] = count
    return stats


async def mark_error_resolved(
    db: AsyncSession,
    error_id: int,
    user_id: int,
    fixed_code: str | None = None,
) -> bool:
    """将错题标记为已解决

    Args:
        db: 数据库会话
        error_id: 错误记录 ID
        user_id: 用户 ID（用于验证归属）
        fixed_code: 修正后的代码（可选）

    Returns:
        是否成功标记（False 表示记录不存在或不属于该用户）
    """
    result = await db.execute(
        select(UserError).where(
            UserError.id == error_id,
            UserError.user_id == user_id,
        )
    )
    error = result.scalars().first()
    if not error:
        return False
    error.is_resolved = True
    if fixed_code:
        error.fixed_code = fixed_code
    await db.commit()
    return True
