"""AI 对话服务 - AIProvider 抽象工厂（DeepSeek → Mock 降级）"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import AsyncGenerator, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

DEEPSEEK_CHAT_URL = "https://api.deepseek.com/v1/chat/completions"

SYSTEM_PROMPT = (
    "你是一个友好的编程学习助手 Hello World AI。"
    "你帮助用户解决编程问题，提供思路引导而非直接给出答案。"
    "你的回答应简洁、鼓励性强，适合编程初学者理解。"
    "当用户贴出代码时，你可以指出潜在问题并给出改进建议。"
)


# ---- AIProvider 抽象工厂 ----
class AIProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict], temperature: float = 0.7, json_mode: bool = False) -> str: ...
    @abstractmethod
    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]: ...
    @property
    @abstractmethod
    def name(self) -> str: ...


class DeepSeekProvider(AIProvider):
    name = "deepseek"
    async def chat(self, messages, temperature=0.7, json_mode=False):
        payload: dict = {"model": settings.DEEPSEEK_MODEL, "messages": messages, "stream": False, "temperature": temperature}
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        last_error = ""
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post(DEEPSEEK_CHAT_URL, headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}, json=payload)
                    if resp.status_code == 429:
                        last_error = "请求过于频繁，请稍后重试"
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    if resp.status_code == 503:
                        last_error = "AI 服务暂时过载"
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    if resp.status_code >= 400:
                        raise RuntimeError(f"DeepSeek {resp.status_code}: {resp.text[:200]}")
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                last_error = "连接超时"
                if attempt < 2:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                raise RuntimeError(f"连接失败: {e}") from e
        raise RuntimeError(last_error or "AI 服务不可用")

    async def stream(self, messages):
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", DEEPSEEK_CHAT_URL, headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}, json={"model": settings.DEEPSEEK_MODEL, "messages": messages, "stream": True, "temperature": 0.7}) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data: "): continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]": break
                    try:
                        chunk = json.loads(data_str)
                        content = chunk["choices"][0].get("delta", {}).get("content", "")
                        if content: yield content
                    except (json.JSONDecodeError, KeyError, IndexError): continue


class MockProvider(AIProvider):
    name = "mock"
    async def chat(self, messages, temperature=0.7, json_mode=False):
        system = messages[0]["content"] if messages else ""
        if json_mode:
            return json.dumps({"correctness": 80, "readability": 75, "performance": 70, "robustness": 65, "issues": [], "overall": "[Mock] DeepSeek API Key 未配置，显示占位审查结果。请在 .env 中设置 DEEPSEEK_API_KEY。"})
        if "诊断" in system:
            return "[Mock] 诊断模式就绪。配置 DEEPSEEK_API_KEY 后可获得 AI 代码诊断。"
        if "导师" in system:
            return "[Mock] 导师模式就绪。配置 DEEPSEEK_API_KEY 后可获得 AI 学习指导。"
        if "规划" in system:
            return "[Mock] 规划模式就绪。配置 DEEPSEEK_API_KEY 后可获得 AI 学习规划。"
        return "[Mock] AI 服务未配置。请在 .env 中设置 DEEPSEEK_API_KEY 以使用真实 AI。"

    async def stream(self, messages):
        yield "[Mock] AI 服务未配置，请设置 DEEPSEEK_API_KEY。"


def _get_provider() -> AIProvider:
    """按 AI_PROVIDER_PRIORITY 依次尝试实例化 Provider"""
    priority = [p.strip() for p in settings.AI_PROVIDER_PRIORITY.split(",") if p.strip()]
    for name in priority:
        if name == "deepseek" and settings.DEEPSEEK_API_KEY:
            return DeepSeekProvider()
        elif name == "mock":
            return MockProvider()
    return MockProvider()


def _api_key() -> str:
    key = settings.DEEPSEEK_API_KEY
    if not key:
        raise RuntimeError("DeepSeek API Key 未配置，请在 .env 中设置 DEEPSEEK_API_KEY")
    return key

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


def _api_key() -> str:
    key = settings.DEEPSEEK_API_KEY
    if not key:
        raise RuntimeError("DeepSeek API Key 未配置，请在 .env 中设置 DEEPSEEK_API_KEY")
    return key


async def chat_with_ai(
    message: str,
    context: Optional[dict] = None,
) -> str:
    """非流式 AI 对话"""
    messages = _build_messages(message, context)
    provider = _get_provider()
    try:
        return await provider.chat(messages)
    except Exception as e:
        logger.error(f"AI ({provider.name}) 请求失败: {e}")
        raise RuntimeError("AI 服务不可用") from e


async def chat_with_ai_stream(
    message: str,
    context: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """流式 AI 对话，逐块返回响应内容"""
    messages = _build_messages(message, context)
    provider = _get_provider()
    try:
        async for chunk in provider.stream(messages):
            yield chunk
    except Exception as e:
        logger.error(f"AI ({provider.name}) 流式请求失败: {e}")
        yield "AI 服务暂时不可用，请稍后重试。"


# ---- 四模式 Prompt ----
MODE_PROMPTS = {
    "diagnostic": (
        "你是一名资深代码诊断专家。请分析以下代码，找出语法错误、逻辑缺陷和潜在风险。"
        "用中文逐条列出问题，并给出修复建议。"
    ),
    "tutor": (
        "你是一名耐心的编程导师。请针对以下代码给出学习指导，引导学习者自己发现问题，"
        "不要直接给出完整答案。用鼓励的语气，指出关键思路和下一步方向。"
    ),
    "review": (
        "你是一名严格的代码审查官。请从正确性、可读性、性能、健壮性四个维度评审以下代码。"
        "每个维度打 0-100 分。只返回 JSON，格式："
        '{"correctness": 85, "readability": 70, "performance": 75, "robustness": 60, "issues": [{"line": 3, "message": "变量命名不清晰", "severity": "warning"}], "overall": "总体评价文字"}'
    ),
    "plan": (
        "你是一名学习规划师。请根据以下题目和代码，分析学习者当前的知识薄弱点，"
        "推荐下一步应该学习的内容和练习方向。"
    ),
}


async def run_ai_action(mode: str, code: str, lesson_title: str = "", language: str = "") -> str:
    """根据模式执行 AI 分析，返回文本结果。自动组合模式 Prompt + 语言 Prompt。"""
    mode_prompt = MODE_PROMPTS.get(mode, MODE_PROMPTS["tutor"])
    # 组合语言级 Prompt（映射 plan→tutor, review→reviewer）
    lang_key = {"diagnostic": "tutor", "tutor": "tutor", "plan": "tutor", "review": "reviewer"}.get(mode, "tutor")
    lang_prompt = LANGUAGE_PROMPTS.get(language.lower(), {}).get(lang_key, "")
    system_prompt = f"{mode_prompt}\n{lang_prompt}" if lang_prompt else mode_prompt
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"题目：{lesson_title or '未知'}\n语言：{language or '未知'}\n代码：\n```\n{code}\n```"},
    ]
    provider = _get_provider()
    return await provider.chat(messages, temperature=0.3, json_mode=(mode == "review"))


async def classify_error_with_ai(code: str, stderr: str, score: int, test_results: list | None = None) -> dict:
    """AI 错误分类 — 返回 error_type 和 analysis"""
    system_prompt = (
        "你是代码诊断专家。根据以下信息对代码错误分类。"
        "返回 JSON：{\"error_type\": \"syntax|logic|boundary|performance|other\", \"analysis\": \"详细分析\"}"
    )
    user_msg = f"代码：\n```\n{code}\n```\n错误：{stderr}\n得分：{score}\n测试结果：{test_results or '无'}\n\n只返回 JSON。"
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}]
    provider = _get_provider()
    try:
        result_text = await provider.chat(messages, temperature=0.1, json_mode=True)
        result = json.loads(result_text)
        return {"error_type": result.get("error_type", "logic"), "analysis": result.get("analysis", "")}
    except Exception as e:
        logger.warning(f"AI ({provider.name}) 分类失败，降级规则分类: {e}")
        return {"error_type": "logic", "analysis": None}
