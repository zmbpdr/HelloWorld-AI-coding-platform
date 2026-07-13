"""AI对话路由 - 聊天、历史记录"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.core.rate_limit import ai_limiter
from app.core.security import decode_access_token
from app.services.ai_service import chat_with_ai, chat_with_ai_stream
from app.schemas.ai import ChatRequest, ChatResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ai/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
):
    """发送消息（非流式）"""
    await ai_limiter(request=req, identifier=str(current_user.id))
    try:
        reply = await chat_with_ai(
            message=request.message,
            context=request.context,
        )
        return ChatResponse(reply=reply)
    except Exception as e:
        logger.exception(f"AI 对话异常: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="AI服务暂时不可用，请稍后重试")


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
