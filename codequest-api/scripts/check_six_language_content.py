"""校验六语言课程数据。

在 codequest-api 目录运行：python scripts/check_six_language_content.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


LANGUAGES = ("python", "javascript", "java", "c", "cpp", "typescript")
# 固定基线：172 关（经 A 确认）
BASELINE = {"python": 34, "javascript": 30, "java": 30, "c": 20, "cpp": 28, "typescript": 30}
REQUIRED_FIELDS = ("title", "slug", "description", "content", "order", "starter_code", "solution_code", "test_cases", "hint")
LESSONS_DIR = Path(__file__).resolve().parents[2] / "codequest-content" / "lessons"


def main() -> int:
    errors: list[str] = []
    slugs: list[str] = []
    total = 0
    for language in LANGUAGES:
        path = LESSONS_DIR / f"{language}.json"
        try:
            lessons = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            errors.append(f"{language}: 无法读取 JSON（{error}）")
            continue
        if not lessons:
            errors.append(f"{language}: 课程列表为空")
            continue
        expected = BASELINE.get(language)
        if expected is not None and len(lessons) != expected:
            errors.append(f"{language}: 应为 {expected} 关，实际 {len(lessons)} 关")
        total += len(lessons)
        for index, lesson in enumerate(lessons, start=1):
            missing = [field for field in REQUIRED_FIELDS if not lesson.get(field) and lesson.get(field) != 0]
            if missing:
                errors.append(f"{language} 第 {index} 关缺少字段：{', '.join(missing)}")
            if lesson.get("order") != index:
                errors.append(f"{language} 第 {index} 关 order 应为 {index}，实际 {lesson.get('order')}")
            if not isinstance(lesson.get("test_cases"), list) or not lesson["test_cases"]:
                errors.append(f"{language} 第 {index} 关缺少测试用例")
            slugs.append(lesson.get("slug", ""))
    expected_total = sum(BASELINE.values())
    if total != expected_total:
        errors.append(f"总关卡数应为 {expected_total}，实际 {total}")
    duplicates = [slug for slug, count in Counter(slugs).items() if slug and count > 1]
    if duplicates:
        errors.append(f"重复 slug：{', '.join(duplicates)}")
    if errors:
        print(f"[FAIL] 课程检查失败，共 {len(errors)} 个错误")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"[PASS] 6 种语言、{total} 个关卡全部通过；字段、顺序、测试用例和 slug 均有效。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
