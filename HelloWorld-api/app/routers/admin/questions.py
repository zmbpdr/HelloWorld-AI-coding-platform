"""管理后台题库管理路由

提供题目的增删改查功能，支持按语言、难度、题型筛选，以及
批量导入（Excel/CSV 预检查 + 确认入库）和 CSV 导出。
"""

import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.encoders import jsonable_encoder
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.admin import AdminUser
from app.models.question import Question
from app.schemas.admin import (
    AdminQuestionCreate,
    AdminQuestionUpdate,
    AdminQuestionResponse,
    VALID_QUESTION_TYPES,
)
from app.services.admin_service import AdminService
from app.core.admin_deps import get_current_admin, require_role

router = APIRouter()

# CSV 表头（与前端模板一致）
EXPORT_FIELDS = [
    "id", "title", "slug", "language_id", "difficulty", "question_type",
    "description", "content", "options", "answer", "explanation",
    "test_cases", "starter_code", "knowledge_tags", "order", "is_active",
]


def _validate_question_type(question_type: str) -> None:
    """校验题目类型是否合法"""
    if question_type not in VALID_QUESTION_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"无效的题目类型 '{question_type}'，支持: {', '.join(sorted(VALID_QUESTION_TYPES))}",
        )


def _parse_import_file(filename: str, content: bytes) -> list[dict]:
    """解析上传的导入文件（支持 CSV / Excel）。

    Excel 需要 openpyxl，未安装时自动降级为 CSV；解析失败抛出 HTTPException。
    """
    name = (filename or "").lower()
    if name.endswith(".csv"):
        text = content.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        rows = []
        for raw in reader:
            row = {k.strip(): (v or "").strip() for k, v in raw.items() if k}
            if any(row.values()):
                rows.append(row)
        return rows
    if name.endswith((".xlsx", ".xls")):
        try:
            import openpyxl  # 可选依赖
        except ImportError:
            raise HTTPException(
                status_code=422,
                detail="服务器未安装 openpyxl，无法解析 Excel 文件，请改用 CSV 或先安装 openpyxl",
            )
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(h).strip() if h is not None else "" for h in rows[0]]
        result = []
        for values in rows[1:]:
            row = {
                headers[i]: ("" if values[i] is None else str(values[i]).strip())
                for i in range(len(headers))
            }
            if any(row.values()):
                result.append(row)
        return result
    raise HTTPException(status_code=422, detail="仅支持 .csv / .xlsx / .xls 文件")


def _parse_int(value, field: str, row_errors: list) -> int | None:
    """解析整数，失败时记录错误"""
    if value is None or str(value).strip() == "":
        row_errors.append({"field": field, "message": f"{field} 不能为空"})
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        row_errors.append({"field": field, "message": f"{field} 必须是整数"})
        return None


def _parse_json_list(value, field: str, row_errors: list, required: bool = False) -> list | None:
    """解析 JSON 数组字段，失败时记录错误"""
    if value is None or str(value).strip() == "":
        if required:
            row_errors.append({"field": field, "message": f"{field} 不能为空"})
        return []
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        row_errors.append({"field": field, "message": f"{field} 必须是合法的 JSON"})
        return None
    if not isinstance(parsed, list):
        row_errors.append({"field": field, "message": f"{field} 必须是 JSON 数组"})
        return None
    return parsed


def _validate_import_row(row: dict, db: AsyncSession, row_errors: list) -> dict | None:
    """逐行校验导入数据，返回规范化后的题目字段；有错误时写入 row_errors 并返回 None"""
    errors: list = []

    title = str(row.get("title", "")).strip()
    if not title:
        errors.append({"field": "title", "message": "标题不能为空"})

    slug = str(row.get("slug", "")).strip()
    if not slug:
        errors.append({"field": "slug", "message": "Slug 不能为空"})

    language_id = _parse_int(row.get("language_id"), "language_id", errors)
    difficulty = str(row.get("difficulty", "")).strip() or "beginner"
    if difficulty not in ("beginner", "intermediate", "advanced"):
        errors.append({"field": "difficulty", "message": "难度必须是 beginner/intermediate/advanced"})

    question_type = str(row.get("question_type", "")).strip() or "coding"
    if question_type not in VALID_QUESTION_TYPES:
        errors.append({"field": "question_type", "message": f"无效的题型 '{question_type}'"})

    test_cases = _parse_json_list(row.get("test_cases"), "test_cases", errors)
    options = _parse_json_list(row.get("options"), "options", errors)
    knowledge_tags = [
        t.strip() for t in str(row.get("knowledge_tags", "")).replace(";", ",").split(",") if t.strip()
    ]


    if errors:
        row_errors.extend(errors)
        return None

    return {
        "language_id": language_id,
        "title": title,
        "slug": slug,
        "difficulty": difficulty,
        "question_type": question_type,
        "description": str(row.get("description", "")).strip() or None,
        "content": str(row.get("content", "")).strip() or None,
        "options": options,
        "answer": str(row.get("answer", "")).strip() or None,
        "explanation": str(row.get("explanation", "")).strip() or None,
        "test_cases": test_cases,
        "starter_code": str(row.get("starter_code", "")).strip() or None,
        "knowledge_tags": knowledge_tags,
        "order": _parse_int(row.get("order"), "order", errors) or 0,
        "is_active": True,
    }


@router.get("/questions")
async def list_questions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    language_id: int | None = None,
    difficulty: str | None = None,
    question_type: str | None = None,
    keyword: str | None = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取题目列表（支持分页和按语言/难度/题型筛选 + 关键词搜索）"""
    service = AdminService(db)
    return await service.get_questions_list(
        page, page_size, language_id, difficulty, question_type, keyword,
    )


@router.get("/questions/export")
async def export_questions(
    language_id: int | None = None,
    difficulty: str | None = None,
    question_type: str | None = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """批量导出题目为 CSV（支持按语言/难度/题型筛选）"""
    service = AdminService(db)
    result = await service.get_questions_list(
        1, 100000, language_id, difficulty, question_type,
    )
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=EXPORT_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for item in result["items"]:
        row = dict(item)
        # 列表字段序列化为 JSON 字符串
        for key in ("options", "test_cases", "knowledge_tags"):
            val = row.get(key)
            if isinstance(val, (list, dict)):
                row[key] = json.dumps(val, ensure_ascii=False)
            else:
                row[key] = "" if val is None else str(val)
        writer.writerow(row)
    # 加 BOM，保证 Excel 打开中文不乱码
    csv_content = "\ufeff" + buffer.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=questions.csv"},
    )


@router.post("/questions/import")
async def import_questions(
    file: UploadFile = File(...),
    confirm: bool = Form(False),
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """批量导入题目（Excel/CSV）

    - confirm=False（默认）：仅预检查，返回 {total, valid_count, error_count, errors}
    - confirm=True：校验通过后入库（存在错误时拒绝并返回错误报告）
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="文件为空")

    try:
        rows = _parse_import_file(file.filename or "", content)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=422, detail=f"文件解析失败: {exc}")

    if not rows:
        raise HTTPException(status_code=422, detail="文件中没有有效数据（需包含表头）")

    # 预检查：逐行校验 + Slug 唯一性（含库内已有数据）
    errors: list[dict] = []
    valid_rows: list[dict] = []
    for idx, row in enumerate(rows, start=2):  # 第 1 行是表头
        row_errors: list = []
        normalized = _validate_import_row(row, db, row_errors)
        # Slug 唯一性（异步检查）
        if normalized and normalized.get("slug"):
            existing = await db.execute(
                select(Question).where(Question.slug == normalized["slug"])
            )
            if existing.scalars().first():
                row_errors.append({"field": "slug", "message": f"Slug '{normalized['slug']}' 已存在"})
        if row_errors:
            for err in row_errors:
                errors.append({"row": idx, "field": err["field"], "message": err["message"]})
        elif normalized:
            valid_rows.append(normalized)

    total = len(rows)
    valid_count = len(valid_rows)
    error_count = len(errors)

    # 确认入库：有错误则拒绝整体入库（保证数据一致性）
    if confirm:
        if errors:
            return {
                "total": total,
                "valid_count": valid_count,
                "error_count": error_count,
                "errors": errors,
                "imported": 0,
                "message": "存在校验错误，未导入任何数据",
            }
        try:
            for row in valid_rows:
                db.add(Question(**row))
            await db.commit()
        except Exception as exc:  # 事务失败整体回滚
            await db.rollback()
            raise HTTPException(status_code=422, detail=f"导入失败，已回滚: {exc}")
        return {
            "total": total,
            "valid_count": valid_count,
            "error_count": 0,
            "errors": [],
            "imported": valid_count,
            "message": f"成功导入 {valid_count} 条题目",
        }

    # 预检查模式
    return {
        "total": total,
        "valid_count": valid_count,
        "error_count": error_count,
        "errors": errors,
        "imported": 0,
        "message": "预检查完成",
    }


@router.get("/questions/{question_id}", response_model=AdminQuestionResponse)
async def get_question(
    question_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取题目详情"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question


@router.post("/questions", response_model=AdminQuestionResponse, status_code=201)
async def create_question(
    data: AdminQuestionCreate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """新增题目"""
    # 校验题目类型
    _validate_question_type(data.question_type)

    # 校验 slug 唯一性
    existing = await db.execute(select(Question).where(Question.slug == data.slug))
    if existing.scalars().first():
        raise HTTPException(status_code=422, detail=f"Slug '{data.slug}' 已存在")

    question = Question(**data.model_dump())
    db.add(question)
    await db.flush()
    await db.refresh(question)

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(
        current_admin.id, "create", "question", question.id,
        new_value=data.model_dump(),
    )

    await db.commit()
    return question


@router.put("/questions/{question_id}", response_model=AdminQuestionResponse)
async def update_question(
    question_id: int,
    data: AdminQuestionUpdate,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """编辑题目"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 记录旧值（用于审计日志）
    old_data = jsonable_encoder(
        {c.name: getattr(question, c.name) for c in question.__table__.columns}
    )

    update_data = data.model_dump(exclude_unset=True)

    # 校验题目类型
    if "question_type" in update_data:
        _validate_question_type(update_data["question_type"])

    # 校验 slug 唯一性（如果 slug 有变更）
    if "slug" in update_data and update_data["slug"] != question.slug:
        existing = await db.execute(
            select(Question).where(Question.slug == update_data["slug"])
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=422,
                detail=f"Slug '{update_data['slug']}' 已存在",
            )

    for key, value in update_data.items():
        setattr(question, key, value)

    await db.flush()
    await db.refresh(question)

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(
        current_admin.id, "update", "question", question_id,
        old_value=old_data, new_value=update_data,
    )

    await db.commit()
    return question


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """软删除题目（将 is_active 设为 False）"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 软删除：标记为不可用，而非物理删除
    question.is_active = False

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, "delete", "question", question_id)

    await db.commit()
    return {"message": "已删除"}


@router.post("/questions/{question_id}/publish")
async def toggle_publish(
    question_id: int,
    current_admin: AdminUser = Depends(require_role("editor")),
    db: AsyncSession = Depends(get_db),
):
    """发布/下架题目"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 切换发布状态
    question.is_active = not question.is_active
    action = "publish" if question.is_active else "unpublish"

    # 记录审计日志
    service = AdminService(db)
    await service.log_action(current_admin.id, action, "question", question_id)

    await db.commit()
    return {"message": f"已{'发布' if action == 'publish' else '下架'}"}