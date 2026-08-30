"""AI对话路由 - 聊天、历史记录"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.core.rate_limit import ai_limiter
from app.core.security import decode_access_token
from app.services.ai_service import chat_with_ai, chat_with_ai_stream, run_ai_action, classify_error_with_ai
from app.services.membership_service import consume_ai_quota
from app.services.rag_service import search_lesson_context
from datetime import datetime, timedelta, timezone
from app.schemas.ai import ChatRequest, ChatResponse, AIActionRequest, ReviewResponse, TutorResponse
from app.models.chat import ChatHistory
from app.models.progress import Progress
from app.models.submission import Submission as SubModel
from app.models.knowledge import UserKnowledge
from sqlalchemy import func

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ai/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发送消息（非流式）

    如存在 lesson_id / lesson_title / code 等上下文，自动检索对应课程内容并注入
    到 AI 请求中，形成最小可用 RAG 上下文。
    """
    await ai_limiter(request=req, identifier=str(current_user.id))
    try:
        context = request.context or {}
        lesson_id = context.get("lesson_id")
        if lesson_id is not None:
            rag_results = await search_lesson_context(
                db,
                lesson_id=int(lesson_id),
                query=request.message,
                limit=3,
            )
            if rag_results:
                context["rag_results"] = rag_results

        reply = await chat_with_ai(
            message=request.message,
            context=context,
        )
        consume_ai_quota(current_user)
        await db.commit()
        return ChatResponse(reply=reply)
    except Exception as e:
        logger.exception(f"AI 对话异常: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="AI服务暂时不可用，请稍后重试")


# 四模式通用辅助：查询课程标题和语言后调用 AI
async def _ai_mode(mode: str, request: AIActionRequest, current_user: User, db: AsyncSession) -> dict:
    lesson_title, language = "", ""
    if request.lesson_id:
        from app.models.lesson import Lesson
        from app.models.course import Language
        lesson_result = await db.execute(select(Lesson).where(Lesson.id == request.lesson_id))
        lesson = lesson_result.scalars().first()
        if lesson:
            lesson_title = lesson.title
            lang_result = await db.execute(select(Language).where(Language.id == lesson.language_id))
            lang = lang_result.scalars().first()
            if lang:
                language = lang.slug
    return await run_ai_action(mode, request.code, lesson_title, language)


@router.post("/ai/diagnostic", response_model=TutorResponse)
async def ai_diagnostic(request: AIActionRequest, req: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await ai_limiter(request=req, identifier=str(current_user.id))
    try:
        response_text = await _ai_mode("diagnostic", request, current_user, db)
        consume_ai_quota(current_user); await db.commit()
        return {"response": response_text}
    except Exception as e:
        logger.exception(f"diagnostic: {e}"); raise HTTPException(500, str(e)[:200])


@router.post("/ai/tutor", response_model=TutorResponse)
async def ai_tutor(request: AIActionRequest, req: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await ai_limiter(request=req, identifier=str(current_user.id))
    try:
        response_text = await _ai_mode("tutor", request, current_user, db)
        consume_ai_quota(current_user); await db.commit()
        return {"response": response_text}
    except Exception as e:
        logger.exception(f"tutor: {e}"); raise HTTPException(500, str(e)[:200])


@router.post("/ai/review", response_model=ReviewResponse)
async def ai_review(request: AIActionRequest, req: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await ai_limiter(request=req, identifier=str(current_user.id))
    try:
        response_text = await _ai_mode("review", request, current_user, db)
        consume_ai_quota(current_user); await db.commit()
        try:
            import json
            data = json.loads(response_text.strip().removeprefix("```json").removesuffix("```").strip())
            return {
                "scores": {k: data.get(k, 70) for k in ("correctness", "readability", "performance", "robustness")},
                "issues": data.get("issues", []),
                "overall": data.get("overall", response_text),
            }
        except (json.JSONDecodeError, AttributeError):
            return {"scores": {"correctness": 70, "readability": 70, "performance": 70, "robustness": 70}, "issues": [], "overall": response_text}
    except Exception as e:
        logger.exception(f"review: {e}"); raise HTTPException(500, str(e)[:200])


@router.post("/ai/plan", response_model=TutorResponse)
async def ai_plan(request: AIActionRequest, req: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await ai_limiter(request=req, identifier=str(current_user.id))
    try:
        response_text = await _ai_mode("plan", request, current_user, db)
        consume_ai_quota(current_user); await db.commit()
        return {"response": response_text}
    except Exception as e:
        logger.exception(f"plan: {e}"); raise HTTPException(500, str(e)[:200])


@router.post("/ai/classify-error")
async def ai_classify_error(
    request: dict,
    req: Request,
    current_user: User = Depends(get_current_user),
):
    """AI 错误分类 — 返回 error_type 和 analysis"""
    code = request.get("code", "")
    stderr = request.get("stderr", "")
    score = request.get("score", 0)
    test_results = request.get("test_results")
    result = await classify_error_with_ai(code, stderr, score, test_results)
    return result


@router.get("/ai/weekly-report")
async def ai_weekly_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI 周报 — 基于本周学习数据生成总结"""
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    prog_result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.status == "completed",
            Progress.completed_at >= week_ago,
        )
    )
    completions = prog_result.scalars().all()

    sub_result = await db.execute(
        select(func.count()).select_from(SubModel).where(
            SubModel.user_id == current_user.id,
            SubModel.created_at >= week_ago,
        )
    )
    submissions_week = sub_result.scalar() or 0

    know_result = await db.execute(
        select(UserKnowledge).where(UserKnowledge.user_id == current_user.id)
    )
    knowledge = know_result.scalars().all()

    summary = (
        f"本周完成 {len(completions)} 个关卡，提交 {submissions_week} 次代码。"
        f"知识掌握度：{', '.join(f'{k.knowledge_tag}: {k.mastery}%' for k in knowledge[:8]) or '暂无数据'}。"
    )

    try:
        response_text = await chat_with_ai(
            message=f"请根据以下学习数据生成一份简短的学习周报（避免 Markdown）：{summary}",
            context={"mode": "tutor"},
        )
        return {"report": response_text}
    except Exception as e:
        logger.warning(f"周报生成失败: {e}")
        return {"report": f"📊 学习周报\n\n{summary}\n\n继续加油！"}
async def websocket_chat(websocket: WebSocket, token: str = ""):
    """WebSocket 流式AI对话（需 token 认证）"""
    # 验证 token
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=4001, reason="未认证")
        return

    user_id = int(payload["sub"])
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                message = msg.get("message", "")
                context = msg.get("context")

                async for chunk in chat_with_ai_stream(message=message, context=context):
                    await websocket.send_json({"chunk": chunk, "done": False})

                await websocket.send_json({"chunk": "", "done": True})
            except json.JSONDecodeError:
                await websocket.send_json({"chunk": "消息格式错误", "done": True})
            except Exception as e:
                logger.exception(f"WebSocket AI 异常: {type(e).__name__}: {e}")
                await websocket.send_json({"chunk": "AI服务暂时不可用，请稍后重试", "done": True})
    except WebSocketDisconnect:
        pass


@router.get("/ai/history")
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的对话历史"""
    result = await db.execute(
        select(ChatHistory).where(
            ChatHistory.user_id == current_user.id,
        ).order_by(ChatHistory.updated_at.desc())
    )
    histories = result.scalars().all()
    return {
        "history": [
            {
                "lesson_id": h.lesson_id,
                "messages": h.messages,
                "updated_at": h.updated_at.isoformat() if h.updated_at else None,
            }
            for h in histories
        ]
    }


@router.post("/ai/history")
async def save_chat_history(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """保存对话历史"""
    lesson_id = request.get("lesson_id")
    messages = request.get("messages", [])
    result = await db.execute(
        select(ChatHistory).where(
            ChatHistory.user_id == current_user.id,
            ChatHistory.lesson_id == lesson_id,
        )
    )
    record = result.scalars().first()
    if record:
        record.messages = messages
        record.updated_at = datetime.now(timezone.utc)
    else:
        record = ChatHistory(user_id=current_user.id, lesson_id=lesson_id, messages=messages)
        db.add(record)
    await db.commit()
    return {"message": "已保存"}


@router.delete("/ai/history")
async def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    lesson_id: int = None,
):
    """清空对话历史"""
    query = select(ChatHistory).where(ChatHistory.user_id == current_user.id)
    if lesson_id is not None:
        query = query.where(ChatHistory.lesson_id == lesson_id)
    result = await db.execute(query)
    records = result.scalars().all()
    for r in records:
        await db.delete(r)
    await db.commit()
    return {"message": "已清空"}
