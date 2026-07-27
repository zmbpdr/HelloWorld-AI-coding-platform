from types import SimpleNamespace
import unittest

from app.services.recommendation_service import build_recommendation_payload


def lesson(lesson_id, order, tags, title="课时"):
    return SimpleNamespace(
        id=lesson_id,
        order=order,
        title=title,
        slug=f"python-{lesson_id}",
        knowledge_tags=tags,
        is_active=True,
        language=SimpleNamespace(sort_order=1),
    )


def knowledge(tag, mastery):
    return SimpleNamespace(knowledge_tag=tag, mastery=mastery)


class RecommendationTests(unittest.TestCase):
    def test_new_user_falls_back_to_first_incomplete_lesson(self):
        result = build_recommendation_payload([lesson(1, 1, ["变量与数据类型"])], [], set())
        self.assertEqual(result["recommended"], [])
        self.assertEqual(result["next_normal"]["lesson_id"], 1)

    def test_weakest_tag_matches_unfinished_lesson(self):
        lessons = [lesson(1, 1, ["变量与数据类型"]), lesson(2, 2, ["循环"], "循环")]
        result = build_recommendation_payload(
            lessons,
            [knowledge("变量与数据类型", 90), knowledge("循环", 35)],
            {1},
        )
        self.assertEqual(result["recommended"][0]["lesson_id"], 2)
        self.assertEqual(result["recommended"][0]["matched_tags"], ["循环"])
        self.assertEqual(result["next_normal"]["lesson_id"], 2)

    def test_no_matching_tag_uses_normal_fallback(self):
        result = build_recommendation_payload(
            [lesson(1, 1, ["函数"])], [knowledge("循环", 20)], set()
        )
        self.assertEqual(result["recommended"], [])
        self.assertEqual(result["next_normal"]["lesson_id"], 1)


if __name__ == "__main__":
    unittest.main()
