"""管理后台文件导入路由 — Word/PDF 解析为 Markdown

提供文件上传和解析接口，将 Word (.docx) 和 PDF 文件内容转换为 Markdown 格式，
提取内嵌图片并上传，返回 Markdown 文本供编辑器使用。
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.admin_deps import require_role
from app.models.admin import AdminUser
from app.services.file_import_service import parse_word_to_markdown, parse_pdf_to_markdown

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/lessons/parse-word")
async def parse_word(
    file: UploadFile,
    current_admin: AdminUser = Depends(require_role("editor")),
):
    """上传 Word 文档（.docx），解析为 Markdown

    Returns:
        {"markdown": str, "images": int} — 解析后的 Markdown 内容和提取的图片数量
    """
    if not file.filename or not file.filename.lower().endswith(".docx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 .docx 格式的 Word 文档",
        )

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件大小超过限制（最大 20MB）",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文件内容为空")

    result = parse_word_to_markdown(content)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result["error"])

    return result


@router.post("/lessons/parse-pdf")
async def parse_pdf(
    file: UploadFile,
    current_admin: AdminUser = Depends(require_role("editor")),
):
    """上传 PDF 文档，解析为 Markdown

    Returns:
        {"markdown": str, "images": int, "pages": int} — 解析后的 Markdown、图片数量、页数
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 .pdf 格式的 PDF 文档",
        )

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件大小超过限制（最大 20MB）",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文件内容为空")

    result = parse_pdf_to_markdown(content)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result["error"])

    return result