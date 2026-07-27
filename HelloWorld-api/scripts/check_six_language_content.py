"""校验六语言课程数据。

在 HelloWorld-api 目录运行：python scripts/check_six_language_content.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


LANGUAGES = ("python", "javascript", "java", "c", "cpp", "typescript")
# 固定基线：172 关（经 A 确认）
BASELINE = {"python": 34, "javascript": 30, "java": 30, "c": 20, "cpp": 28, "typescript": 30}
REQUIRED_FIELDS = (
    "title", "slug", "description", "content", "order", "starter_code",
    "solution_code", "test_cases", "hint", "knowledge_tags",
    "estimated_minutes", "prerequisites",
)
LESSONS_DIR = Path(__file__).resolve().parents[2] / "HelloWorld-content" / "lessons"


def main() -> int:
    errors: list[str] = []
    slugs: list[str] = []
    lesson_by_slug: dict[str, tuple[str, list[str]]] = {}
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
            missing = [
                field for field in REQUIRED_FIELDS
                if field != "prerequisites" and not lesson.get(field) and lesson.get(field) != 0
            ]
            if missing:
                errors.append(f"{language} 第 {index} 关缺少字段：{', '.join(missing)}")
            if lesson.get("order") != index:
                errors.append(f"{language} 第 {index} 关 order 应为 {index}，实际 {lesson.get('order')}")
            if not isinstance(lesson.get("test_cases"), list) or not lesson["test_cases"]:
                errors.append(f"{language} 第 {index} 关缺少测试用例")
            tags = lesson.get("knowledge_tags")
            if not isinstance(tags, list) or not tags or not all(isinstance(tag, str) and tag.strip() for tag in tags):
                errors.append(f"{language} 第 {index} 关 knowledge_tags 必须为非空字符串列表")
            minutes = lesson.get("estimated_minutes")
            if type(minutes) is not int or minutes <= 0:
                errors.append(f"{language} 第 {index} 关 estimated_minutes 必须为正整数")
            prerequisites = lesson.get("prerequisites")
            if not isinstance(prerequisites, list) or not all(isinstance(item, str) and item for item in prerequisites):
                errors.append(f"{language} 第 {index} 关 prerequisites 必须为 slug 字符串列表")
            slug = lesson.get("slug", "")
            slugs.append(slug)
            lesson_by_slug[slug] = (language, prerequisites if isinstance(prerequisites, list) else [])
    expected_total = sum(BASELINE.values())
    if total != expected_total:
        errors.append(f"总关卡数应为 {expected_total}，实际 {total}")
    duplicates = [slug for slug, count in Counter(slugs).items() if slug and count > 1]
    if duplicates:
        errors.append(f"重复 slug：{', '.join(duplicates)}")
    for slug, (language, prerequisites) in lesson_by_slug.items():
        for prerequisite in prerequisites:
            target = lesson_by_slug.get(prerequisite)
            if target is None:
                errors.append(f"{slug}: prerequisites 引用了不存在的 slug {prerequisite}")
            elif target[0] != language:
                errors.append(f"{slug}: prerequisites 不允许跨语言引用 {prerequisite}")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(slug: str) -> None:
        if slug in visiting:
            errors.append(f"prerequisites 存在循环依赖，涉及 {slug}")
            return
        if slug in visited:
            return
        visiting.add(slug)
        for prerequisite in lesson_by_slug.get(slug, ("", []))[1]:
            if prerequisite in lesson_by_slug:
                visit(prerequisite)
        visiting.remove(slug)
        visited.add(slug)

    for slug in lesson_by_slug:
        visit(slug)
    if errors:
        print(f"[FAIL] 课程检查失败，共 {len(errors)} 个错误")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"[PASS] 6 种语言、{total} 个关卡全部通过；字段、顺序、测试用例和 slug 均有效。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
