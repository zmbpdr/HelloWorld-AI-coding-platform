"""检查关卡 JSON 文件与数据库导入是否一致

用法：
  python scripts/check_content.py              # 仅检查 JSON 文件
  python scripts/check_content.py --db         # 同时检查数据库导入结果
"""

import json
import sys
from pathlib import Path

# 项目根目录
ROOT = Path(__file__).resolve().parent.parent
LESSONS_DIR = ROOT / "codequest-content" / "lessons"

# 必填字段（基础字段，所有关卡必须有）
REQUIRED_FIELDS = ["slug", "title", "starter_code", "test_cases"]
# 可选字段（D 需要补的标签字段）
OPTIONAL_FIELDS = ["knowledge_tags", "estimated_minutes", "prerequisites"]
# 期望的 6 种语言（方案C）
EXPECTED_LANGUAGES = [
    "python", "javascript", "java", "c", "cpp", "typescript",
]


def check_json_files() -> dict:
    """检查所有 JSON 文件，返回统计信息"""
    print("=" * 60)
    print("  关卡 JSON 文件完整性检查")
    print("=" * 60)

    json_counts = {}
    missing_required = []
    missing_optional = {}
    total = 0

    for json_file in sorted(LESSONS_DIR.glob("*.json")):
        lang = json_file.stem
        with open(json_file, "r", encoding="utf-8") as f:
            lessons = json.load(f)
        count = len(lessons)
        json_counts[lang] = count
        total += count

        for i, lesson in enumerate(lessons):
            # 检查必填字段
            missing = [f for f in REQUIRED_FIELDS if f not in lesson]
            if missing:
                missing_required.append(
                    f"  {lang} 第 {i+1} 关 ({lesson.get('slug', '?')}) 缺少必填字段: {missing}"
                )
            # 检查可选字段
            for f in OPTIONAL_FIELDS:
                if f not in lesson or lesson[f] in (None, "", []):
                    if lang not in missing_optional:
                        missing_optional[lang] = {}
                    if f not in missing_optional[lang]:
                        missing_optional[lang][f] = 0
                    missing_optional[lang][f] += 1

    # 打印关卡统计
    print(f"\n{'语言':<15} {'关卡数':>8}")
    print("-" * 25)
    for lang in EXPECTED_LANGUAGES:
        count = json_counts.get(lang, 0)
        status = "✓" if count > 0 else "⚠ 缺失"
        print(f"  {lang:<13} {count:>5} 关  {status}")
    print("-" * 25)
    print(f"  {'总计':<13} {total:>5} 关")
    print()

    # 检查期望语言是否都有 JSON 文件
    missing_langs = [l for l in EXPECTED_LANGUAGES if l not in json_counts]
    if missing_langs:
        print(f"⚠ 缺少 JSON 文件的语言: {missing_langs}")
    else:
        print(f"✓ {len(EXPECTED_LANGUAGES)} 种语言 JSON 文件齐全")

    # 打印必填字段缺失
    print(f"\n--- 必填字段检查 ({', '.join(REQUIRED_FIELDS)}) ---")
    if missing_required:
        for msg in missing_required:
            print(msg)
    else:
        print("✓ 所有关卡必填字段完整")

    # 打印可选字段缺失情况
    print(f"\n--- 可选字段检查 ({', '.join(OPTIONAL_FIELDS)}) ---")
    print("  (这些字段由 D 负责打标签，缺失不影响运行)")
    if missing_optional:
        for lang in sorted(missing_optional.keys()):
            fields_info = ", ".join(
                f"{f}: {c}关" for f, c in missing_optional[lang].items()
            )
            print(f"  {lang}: {fields_info}")
    else:
        print("✓ 所有关卡可选字段完整")

    return {
        "json_counts": json_counts,
        "total": total,
        "missing_required": missing_required,
        "missing_optional": missing_optional,
    }


def check_db_import():
    """检查数据库导入结果（需要项目依赖已安装）"""
    print("\n" + "=" * 60)
    print("  数据库导入结果检查")
    print("=" * 60)

    try:
        import asyncio
        from sqlalchemy import select, func
        from app.database import async_session
        from app.models.course import Language
        from app.models.lesson import Lesson

        async def _check():
            async with async_session() as session:
                # 检查语言表
                result = await session.execute(
                    select(Language.slug, Language.name).order_by(Language.sort_order)
                )
                langs = result.all()
                print(f"\n  数据库语言数: {len(langs)}")
                for slug, name in langs:
                    print(f"    {slug}: {name}")

                # 检查关卡表
                result = await session.execute(
                    select(func.count(Lesson.id))
                )
                lesson_count = result.scalar()
                print(f"\n  数据库关卡总数: {lesson_count}")

                # 按语言统计关卡
                result = await session.execute(
                    select(Language.slug, func.count(Lesson.id))
                    .join(Lesson, Lesson.language_id == Language.id)
                    .group_by(Language.slug)
                    .order_by(Language.sort_order)
                )
                db_counts = {slug: count for slug, count in result.all()}
                print(f"\n{'语言':<15} {'数据库':>8} {'JSON':>8} {'状态':>6}")
                print("-" * 42)
                for lang in EXPECTED_LANGUAGES:
                    db_c = db_counts.get(lang, 0)
                    json_c = json_counts.get(lang, 0)
                    status = "✓" if db_c == json_c else f"⚠ 差{json_c-db_c}"
                    print(f"  {lang:<13} {db_c:>5} 关  {json_c:>5} 关  {status}")

        asyncio.run(_check())
    except ImportError as e:
        print(f"\n  ⚠ 无法导入数据库模块: {e}")
        print("  请确保在项目根目录下运行，且依赖已安装")
        print("  (这是正常的，脚本仅检查 JSON 即可)")
    except Exception as e:
        print(f"\n  ⚠ 数据库检查失败: {e}")
        print("  请确保数据库已初始化（启动过后端）")


if __name__ == "__main__":
    # 切换工作目录到项目根目录（确保数据库路径正确）
    import os
    os.chdir(str(ROOT))

    # 先检查 JSON 文件
    json_counts = {}
    result = check_json_files()
    json_counts = result["json_counts"]

    # 汇总
    print("\n" + "=" * 60)
    print("  检查结果汇总")
    print("=" * 60)
    print(f"  JSON 文件数: {len(json_counts)}/{len(EXPECTED_LANGUAGES)} 种语言")
    print(f"  JSON 关卡总数: {result['total']} 关")
    print(f"  必填字段缺失: {len(result['missing_required'])} 处")
    opt_missing_total = sum(
        sum(c for c in fields.values())
        for fields in result["missing_optional"].values()
    )
    print(f"  可选字段缺失: {opt_missing_total} 处（由 D 负责打标签）")

    if result["missing_required"]:
        print("\n  ⚠ 存在必填字段缺失，请修复！")
        sys.exit(1)
    else:
        print("\n  ✓ JSON 文件检查通过！")

    # 如果指定了 --db 参数，则检查数据库
    if "--db" in sys.argv:
        check_db_import()