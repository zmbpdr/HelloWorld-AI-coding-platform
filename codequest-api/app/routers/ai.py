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
from app.schemas.ai import ChatRequest, ChatResponse, AIActionRequest, ReviewResponse, TutorResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ai/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发送消息（非流式）"""
    await ai_limiter(request=req, identifier=str(current_user.id))
    try:
        reply = await chat_with_ai(
            message=request.message,
            context=request.context,
        )
        # AI 调用成功后才扣配额，避免失败也扣
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


@router.websocket("/ws/ai/chat")
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
):
    """获取对话历史（占位 - 后续接入数据库存储）"""
    return {"history": []}


@router.delete("/ai/history")
async def clear_chat_history(
    current_user: User = Depends(get_current_user),
):
    """清空对话历史（占位）"""
    return {"message": "已清空"}
