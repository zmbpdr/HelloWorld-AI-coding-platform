"""校验本期六语言、60 关课程数据。

在 codequest-api 目录运行：python scripts/check_six_language_content.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


LANGUAGES = ("python", "javascript", "java", "c", "cpp", "typescript")
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
        total += len(lessons)
        if len(lessons) != 10:
            errors.append(f"{language}: 应为 10 关，实际 {len(lessons)} 关")
        for index, lesson in enumerate(lessons, start=1):
            missing = [field for field in REQUIRED_FIELDS if not lesson.get(field) and lesson.get(field) != 0]
            if missing:
                errors.append(f"{language} 第 {index} 关缺少字段：{', '.join(missing)}")
            if lesson.get("order") != index:
                errors.append(f"{language} 第 {index} 关 order 应为 {index}")
            if not isinstance(lesson.get("test_cases"), list) or not lesson["test_cases"]:
                errors.append(f"{language} 第 {index} 关缺少测试用例")
            slugs.append(lesson.get("slug", ""))
    duplicates = [slug for slug, count in Counter(slugs).items() if slug and count > 1]
    if duplicates:
        errors.append(f"重复 slug：{', '.join(duplicates)}")
    if total != 60:
        errors.append(f"总关卡数应为 60，实际 {total}")
    if errors:
        print("[FAIL] 课程检查失败")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print("[PASS] 找到 6 种主推语言、60 个关卡；字段、顺序、测试用例和 slug 均有效。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
