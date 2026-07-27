"""能力诊断路由 — 提供诊断题目获取和答案提交接口"""

from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.database import get_db
from app.services.diagnostic_service import (
    DIAGNOSTIC_QUESTIONS,
    calculate_diagnostic_result,
    save_diagnostic,
    get_diagnostic,
)
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

router = APIRouter()


class AnswerItem(BaseModel):
    question_id: int
    answer: str


class DiagnosticSubmitRequest(BaseModel):
    answers: list[AnswerItem] = Field(..., min_length=1, max_length=10,
                                       description="用户答案列表，每个元素包含 question_id 和 answer")


@router.get("/diagnostic/questions")
async def get_questions(current_user=Depends(get_current_user)):
    """获取诊断题目（10 道选择题，不返回正确答案）"""
    # 返回时去掉 answer 字段
    safe_questions = [
        {k: v for k, v in q.items() if k != "answer"}
        for q in DIAGNOSTIC_QUESTIONS
    ]
    return {"questions": safe_questions}


@router.post("/diagnostic/submit")
async def submit_diagnostic(
    request: DiagnosticSubmitRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交诊断答案，返回诊断结果"""
    if len(request.answers) < len(DIAGNOSTIC_QUESTIONS):
        raise HTTPException(
            status_code=400,
            detail=f"请回答全部 {len(DIAGNOSTIC_QUESTIONS)} 道题目",
        )

    # 转换为 dict 列表格式
    answers = [{"question_id": a.question_id, "answer": a.answer} for a in request.answers]

    result = calculate_diagnostic_result(answers)
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