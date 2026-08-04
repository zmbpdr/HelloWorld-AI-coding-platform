"""AI 对话服务 - AIProvider 抽象工厂（DeepSeek → Mock 降级）

提供 AI 对话、流式对话、代码审查诊断、错误分类等功能。
支持 DeepSeek 作为主要 AI 提供商，API Key 未配置时自动降级到 Mock。
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import AsyncGenerator, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# DeepSeek API 地址
DEEPSEEK_CHAT_URL = "https://api.deepseek.com/v1/chat/completions"

# 默认系统提示词：友好的编程学习助手
SYSTEM_PROMPT = (
    "你是一个友好的编程学习助手 Hello World AI。"
    "你帮助用户解决编程问题，提供思路引导而非直接给出答案。"
    "你的回答应简洁、鼓励性强，适合编程初学者理解。"
    "当用户贴出代码时，你可以指出潜在问题并给出改进建议。"
    "避免使用 Markdown 标记（##、**、``` 等），用纯文本回复。"
)


# ---- AIProvider 抽象工厂 ----
class AIProvider(ABC):
    """AI 提供商抽象基类，定义统一的聊天和流式接口"""

    @abstractmethod
    async def chat(self, messages: list[dict], temperature: float = 0.7, json_mode: bool = False) -> str: ...
    @abstractmethod
    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]: ...
    @property
    @abstractmethod
    def name(self) -> str: ...


class DeepSeekProvider(AIProvider):
    """DeepSeek API 提供商实现"""

    name = "deepseek"

    async def chat(self, messages, temperature=0.7, json_mode=False):
        """调用 DeepSeek 非流式对话接口

        支持自动重试（最多 3 次），处理 429（频率限制）和 503（服务过载）。

        Args:
            messages: 消息列表
            temperature: 生成温度（0-1）
            json_mode: 是否以 JSON 模式返回

        Returns:
            AI 返回的文本内容
        """
        payload: dict = {"model": settings.DEEPSEEK_MODEL, "messages": messages, "stream": False, "temperature": temperature}
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        last_error = ""
        # 最多重试 3 次
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post(DEEPSEEK_CHAT_URL, headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}, json=payload)
                    # 频率限制，等待后重试
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
        """调用 DeepSeek 流式对话接口，逐块返回内容

        Args:
            messages: 消息列表

        Yields:
            逐块的文本内容
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", DEEPSEEK_CHAT_URL, headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}, json={"model": settings.DEEPSEEK_MODEL, "messages": messages, "stream": True, "temperature": 0.7}) as resp:
                resp.raise_for_status()
                # 解析 SSE 格式的流式响应
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
    """Mock 提供商：API Key 未配置时的降级方案，返回占位提示"""

    name = "mock"

    async def chat(self, messages, temperature=0.7, json_mode=False):
        """返回 Mock 占位响应

        Args:
            messages: 消息列表
            temperature: 生成温度（未使用）
            json_mode: 是否以 JSON 模式返回

        Returns:
            占位文本或 JSON
        """
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
        """流式 Mock 响应

        Args:
            messages: 消息列表

        Yields:
            占位文本
        """
        yield "[Mock] AI 服务未配置，请设置 DEEPSEEK_API_KEY。"


def _get_provider() -> AIProvider:
    """按 AI_PROVIDER_PRIORITY 依次尝试实例化 Provider

    优先级配置中的第一个可用提供商被选中。deepseek 需要配置 API Key，
    mock 始终可用。

    Returns:
        可用的 AIProvider 实例
    """
    priority = [p.strip() for p in settings.AI_PROVIDER_PRIORITY.split(",") if p.strip()]
    for name in priority:
        if name == "deepseek" and settings.DEEPSEEK_API_KEY:
            return DeepSeekProvider()
        elif name == "mock":
            return MockProvider()
    return MockProvider()


def _api_key() -> str:
    """获取 DeepSeek API Key

    Returns:
        API Key 字符串

    Raises:
        RuntimeError: 未配置 API Key
    """
    key = settings.DEEPSEEK_API_KEY
    if not key:
        raise RuntimeError("DeepSeek API Key 未配置，请在 .env 中设置 DEEPSEEK_API_KEY")
    return key

# AI Prompt 文件路径
PROMPTS_PATH = Path(__file__).resolve().parents[3] / "HelloWorld-content" / "ai_prompts.json"


def _load_prompts() -> dict:
    """从文件加载语言级 Prompt 配置

    Returns:
        Prompt 字典，键为语言，值为模式和对应提示词
    """
    try:
        with PROMPTS_PATH.open("r", encoding="utf-8") as prompt_file:
            return json.load(prompt_file)
    except (OSError, json.JSONDecodeError) as error:
        logger.warning("无法加载语言 Prompt，使用通用 Prompt：%s", error)
        return {}


LANGUAGE_PROMPTS = _load_prompts()


def _select_system_prompt(context: Optional[dict]) -> str:
    """根据上下文选择系统提示词

    优先使用语言级 Prompt，否则回退到通用 SYSTEM_PROMPT。

    Args:
        context: 上下文字典，可包含 language、mode 等字段

    Returns:
        选中的系统提示词
    """
    context = context or {}
    language = str(context.get("language", "")).lower()
    mode = "reviewer" if context.get("mode") == "reviewer" else "tutor"
    return LANGUAGE_PROMPTS.get(language, {}).get(mode, SYSTEM_PROMPT)


def _build_messages(message: str, context: Optional[dict] = None) -> list[dict]:
    """构建发送给 LLM 的消息列表

    包含系统提示词、上下文信息（课程、代码、错误）和用户消息。

    Args:
        message: 用户消息内容
        context: 上下文字典（可选），包含 lesson_title、code、error 等

    Returns:
        格式化后的消息列表
    """
    messages = [{"role": "system", "content": _select_system_prompt(context)}]

    if context:
        # 拼接上下文信息
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
    """非流式 AI 对话

    Args:
        message: 用户消息
        context: 上下文信息（可选）

    Returns:
        AI 回复文本

    Raises:
        RuntimeError: AI 服务不可用时抛出
    """
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
    """流式 AI 对话，逐块返回响应内容

    Args:
        message: 用户消息
        context: 上下文信息（可选）

    Yields:
        AI 回复的文本块

    Raises:
        RuntimeError: AI 服务不可用时抛出
    """
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
        "用中文逐条列出问题，并给出修复建议。避免使用 Markdown 标记。"
    ),
    "tutor": (
        "你是一名耐心的编程导师。请针对以下代码给出学习指导，引导学习者自己发现问题，"
        "不要直接给出完整答案。用鼓励的语气，指出关键思路和下一步方向。避免使用 Markdown 标记。"
    ),
    "review": (
        "你是一名严格的代码审查官。请从正确性、可读性、性能、健壮性四个维度评审以下代码。"
        "每个维度打 0-100 分。只返回 JSON，格式："
        '{"correctness": 85, "readability": 70, "performance": 75, "robustness": 60, "issues": [{"line": 3, "message": "变量命名不清晰", "severity": "warning"}], "overall": "总体评价文字"}'
        "。overall 字段不使用 Markdown 标记。"
    ),
    "plan": (
        "你是一名学习规划师。请根据以下题目和代码，分析学习者当前的知识薄弱点，"
        "推荐下一步应该学习的内容和练习方向。避免使用 Markdown 标记。"
    ),
}


async def run_ai_action(mode: str, code: str, lesson_title: str = "", language: str = "") -> str:
    """根据模式执行 AI 分析，返回文本结果

    自动组合模式 Prompt 和语言 Prompt，支持诊断、辅导、审查、规划四种模式。

    Args:
        mode: 分析模式（diagnostic/tutor/review/plan）
        code: 用户代码
        lesson_title: 课时标题
        language: 编程语言

    Returns:
        AI 分析结果文本
    """
    mode_prompt = MODE_PROMPTS.get(mode, MODE_PROMPTS["tutor"])
    # 映射语言级 Prompt：plan→tutor, review→reviewer
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
    """AI 错误分类 — 返回 error_type 和 analysis

    使用 AI 对代码错误进行分类（syntax/logic/boundary/performance/other）。

    Args:
        code: 用户代码
        stderr: 错误输出
        score: 得分
        test_results: 测试结果列表（可选）

    Returns:
        包含 error_type 和 analysis 的字典
    """
    system_prompt = (
        "你是代码诊断专家。根据以下信息对代码错误分类。analysis 字段避免使用 Markdown 标记。"
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
