import unittest

from app.services.ai_service import _build_messages


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


if __name__ == "__main__":
    unittest.main()
