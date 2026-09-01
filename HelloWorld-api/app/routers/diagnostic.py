"""能力诊断路由 — 提供诊断题目获取和答案提交接口

用户完成能力诊断后，系统根据答题结果评估知识水平并推荐合适的起始关卡。
诊断题目从数据库 diagnostic_questions 表读取，教师可通过管理后台自由修改。
"""

from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.database import get_db
from app.services.diagnostic_service import (
    get_diagnostic_questions,
    calculate_diagnostic_result,
    save_diagnostic,
    get_diagnostic,
)
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

router = APIRouter()


class AnswerItem(BaseModel):
    """单题答案"""
    question_id: int
    answer: str


class DiagnosticSubmitRequest(BaseModel):
    """诊断提交请求体"""
    answers: list[AnswerItem] = Field(..., min_length=1, max_length=10,
                                       description="用户答案列表，每个元素包含 question_id 和 answer")


@router.get("/diagnostic/questions")
async def get_questions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取诊断题目（不返回正确答案）"""
    questions = await get_diagnostic_questions(db)
    # 返回时去掉 answer 字段，避免泄露答案
    safe_questions = [
        {k: v for k, v in q.items() if k != "answer"}
        for q in questions
    ]
    return {"questions": safe_questions}


@router.post("/diagnostic/submit")
async def submit_diagnostic(
    request: DiagnosticSubmitRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交诊断答案，返回诊断结果"""
    questions = await get_diagnostic_questions(db)

    if len(request.answers) < len(questions):
        raise HTTPException(
            status_code=400,
            detail=f"请回答全部 {len(questions)} 道题目",
        )

    # 转换为 dict 列表格式
    answers = [{"question_id": a.question_id, "answer": a.answer} for a in request.answers]

    # 计算诊断结果
    result = await calculate_diagnostic_result(answers, db)
    await save_diagnostic(db, current_user.id, result)
    return result


@router.get("/diagnostic/result")
async def get_diagnostic_result(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的诊断结果"""
    result = await get_diagnostic(db, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="尚未完成能力诊断")
    return result