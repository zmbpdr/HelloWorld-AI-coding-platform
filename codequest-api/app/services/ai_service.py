"""AI 对话服务 - 本地大模型聊天与流式响应"""

import json
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

OLLAMA_CHAT_URL = f"{settings.OLLAMA_BASE_URL}/api/chat"

SYSTEM_PROMPT = (
    "你是一个友好的编程学习助手 CodeQuest AI。"
    "你帮助用户解决编程问题，提供思路引导而非直接给出答案。"
    "你的回答应简洁、鼓励性强，适合编程初学者理解。"
    "当用户贴出代码时，你可以指出潜在问题并给出改进建议。"
)

PROMPTS_PATH = Path(__file__).resolve().parents[3] / "codequest-content" / "ai_prompts.json"


def _load_prompts() -> dict:
    try:
        with PROMPTS_PATH.open("r", encoding="utf-8") as prompt_file:
            return json.load(prompt_file)
    except (OSError, json.JSONDecodeError) as error:
        logger.warning("无法加载语言 Prompt，使用通用 Prompt：%s", error)
        return {}


LANGUAGE_PROMPTS = _load_prompts()


def _select_system_prompt(context: Optional[dict]) -> str:
    context = context or {}
    language = str(context.get("language", "")).lower()
    mode = "reviewer" if context.get("mode") == "reviewer" else "tutor"
    return LANGUAGE_PROMPTS.get(language, {}).get(mode, SYSTEM_PROMPT)


def _build_messages(message: str, context: Optional[dict] = None) -> list[dict]:
    """构建发送给 LLM 的消息列表"""
    messages = [{"role": "system", "content": _select_system_prompt(context)}]

    if context:
        context_str_parts = []
        if context.get("lesson_title"):
            context_str_parts.append(f"当前课程: {context['lesson_title']}")
        if context.get("code"):
            context_str_parts.append(f"用户代码:\n```\n{context['code']}\n```")
        if context.get("error"):
            context_str_parts.append(f"错误信息: {context['error']}")
        if context_str_parts:
            messages.append({"role": "system", "content": "\n".join(context_str_parts)})

    messages.append({"role": "user", "content": message})
    return messages


async def chat_with_ai(
    message: str,
    context: Optional[dict] = None,
) -> str:
    """非流式 AI 对话"""
    messages = _build_messages(message, context)

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                OLLAMA_CHAT_URL,
                json={
                    "model": "qwen2.5:7b",
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.7},
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "抱歉，AI 服务暂时无响应。")
        except httpx.HTTPError as e:
            logger.error(f"Ollama API 请求失败: {e}")
            raise RuntimeError("AI 服务不可用") from e


async def chat_with_ai_stream(
    message: str,
    context: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """流式 AI 对话，逐块返回响应内容"""
    messages = _build_messages(message, context)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream(
                "POST",
                OLLAMA_CHAT_URL,
                json={
                    "model": "qwen2.5:7b",
                    "messages": messages,
                    "stream": True,
                    "options": {"temperature": 0.7},
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        content = chunk.get("message", {}).get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
        except httpx.HTTPError as e:
            logger.error(f"Ollama 流式请求失败: {e}")
            yield "AI 服务暂时不可用，请稍后重试。"
