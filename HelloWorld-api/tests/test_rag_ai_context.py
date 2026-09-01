import unittest
from unittest.mock import AsyncMock

from app.services import rag_service
from app.services.ai_service import _build_messages
from app.services.rag_service import search_lesson_context


class FakeResult:
    def __init__(self, value):
        self._value = value

    def scalars(self):
        return self

    def first(self):
        return self._value


class FakeSession:
    def __init__(self, lesson):
        self.lesson = lesson

    async def execute(self, *_args, **_kwargs):
        return FakeResult(self.lesson)


class RagAiContextTests(unittest.TestCase):
    def test_build_messages_includes_rag_context_when_provided(self):
        rag_results = [{
            "title": "变量与数据类型",
            "content": "Python 中的变量可以保存数字、字符串和布尔值。",
            "score": 0.92,
        }]

        messages = _build_messages(
            "变量有什么作用？",
            {"lesson_title": "Python 基础入门", "rag_results": rag_results},
        )

        joined = "\n".join(msg["content"] for msg in messages)
        self.assertIn("相关教学内容", joined)
        self.assertIn("变量与数据类型", joined)
        self.assertIn("Python 中的变量可以保存数字", joined)

    def test_search_lesson_context_returns_empty_when_query_has_no_relevant_overlap(self):
        lesson = type("Lesson", (), {
            "id": 2,
            "title": "Python 基础",
            "content": "变量用于存储数据。函数用于复用代码。循环让代码重复执行。",
        })()

        async def run_test():
            # 单元测试不得因本机安装了 ChromaDB 而下载 embedding 模型；
            # 这里明确验证“语义索引不可用时”的关键词降级路径。
            original = rag_service._semantic_search_lesson_context
            rag_service._semantic_search_lesson_context = AsyncMock(return_value=[])
            try:
                result = await search_lesson_context(FakeSession(lesson), 2, "量子计算机和机器学习原理", limit=3)
                self.assertEqual(result, [])
            finally:
                rag_service._semantic_search_lesson_context = original

        import asyncio
        asyncio.run(run_test())

    def test_search_lesson_context_prefers_semantic_results_when_available(self):
        lesson = type("Lesson", (), {
            "id": 3,
            "title": "Python 变量",
            "content": "变量用于存储数据。函数可复用代码。条件语句控制执行流程。",
        })()
        semantic_result = [{"title": "Python 变量", "content": "变量用于存储数据，适合保存用户输入。", "score": 0.97}]

        async def run_test():
            original = getattr(rag_service, "_semantic_search_lesson_context", None)
            rag_service._semantic_search_lesson_context = AsyncMock(return_value=semantic_result)
            try:
                result = await search_lesson_context(FakeSession(lesson), 3, "变量和数据保存", limit=3)
                self.assertEqual(result, semantic_result)
            finally:
                if original is None:
                    delattr(rag_service, "_semantic_search_lesson_context")
                else:
                    rag_service._semantic_search_lesson_context = original

        import asyncio
        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
