"""为当前六语言课程补齐推荐所需的元数据。

默认仅预览；传入 ``--write`` 后才写回 JSON。前置关系严格限定在同一
语言内，并按课程 order 串联，保证课程地图和推荐兜底路径稳定且无环。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


LANGUAGES = ("python", "javascript", "java", "c", "cpp", "typescript")
LESSONS_DIR = Path(__file__).resolve().parents[2] / "HelloWorld-content" / "lessons"


def metadata_for(lesson: dict) -> tuple[list[str], int]:
    """Return shared knowledge tags and a realistic study-time estimate."""
    text = f"{lesson.get('slug', '')} {lesson.get('title', '')}".lower()
    rules: list[tuple[tuple[str, ...], list[str], int]] = [
        (("hello",), ["基础语法", "输出"], 8),
        (("get-age", "variables", "basic-types", "data-types", "add"), ["变量与数据类型"], 10),
        (("operator",), ["运算符", "表达式"], 10),
        (("conditional", "is-adult"), ["条件判断"], 12),
        (("for-loop", "loops", "sum-to"), ["循环"], 14),
        (("array", "list", "sum-array", "array-method"), ["集合与遍历"], 16),
        (("function", "method", "square"), ["函数"], 16),
        (("string", "count-vowels"), ["字符串"], 14),
        (("get-score", "dictionary", "object", "interface", "map"), ["映射与对象"], 18),
        (("pointer",), ["指针与内存"], 20),
        (("class", "oop", "inheritance", "polymorphism"), ["面向对象"], 20),
        (("exception", "error-handling"), ["异常处理"], 18),
        (("module",), ["模块化"], 18),
        (("promise", "async", "nodejs"), ["异步编程"], 22),
        (("generic", "advanced-types", "utility-types", "type-", "enum", "union", "inference"), ["类型系统"], 20),
        (("file-io",), ["文件操作"], 20),
        (("sorting", "binary-search"), ["算法"], 20),
        (("recursion",), ["递归"], 20),
        (("regex",), ["正则表达式"], 18),
        (("decorator", "generator", "closure", "higher-order"), ["高级函数"], 22),
        (("stack-queue", "stl-container", "collections"), ["数据结构"], 20),
        (("calculator", "calculate"), ["综合项目", "函数"], 25),
        (("todo", "count-completed"), ["综合项目", "集合与遍历"], 28),
        (("student-manager", "api-client-sdk"), ["综合项目", "工程实践"], 35),
        (("testing",), ["测试"], 20),
        (("react",), ["前端工程"], 25),
    ]
    for keywords, tags, minutes in rules:
        if any(keyword in text for keyword in keywords):
            return tags, minutes
    return ["编程基础"], 15


def enrich(lessons: list[dict]) -> int:
    lessons.sort(key=lambda lesson: lesson["order"])
    previous_slug: str | None = None
    changed = 0
    for lesson in lessons:
        tags, minutes = metadata_for(lesson)
        desired = {
            "knowledge_tags": tags,
            "estimated_minutes": minutes,
            "prerequisites": [previous_slug] if previous_slug else [],
        }
        if any(lesson.get(key) != value for key, value in desired.items()):
            lesson.update(desired)
            changed += 1
        previous_slug = lesson["slug"]
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="写回课程 JSON")
    args = parser.parse_args()
    total = 0
    for language in LANGUAGES:
        path = LESSONS_DIR / f"{language}.json"
        lessons = json.loads(path.read_text(encoding="utf-8"))
        changed = enrich(lessons)
        total += changed
        print(f"{language}: {changed}/{len(lessons)} lessons updated")
        if args.write:
            path.write_text(json.dumps(lessons, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"total updated: {total}; mode: {'write' if args.write else 'preview'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
