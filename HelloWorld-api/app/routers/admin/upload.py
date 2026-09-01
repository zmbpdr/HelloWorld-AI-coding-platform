"""管理后台图片上传路由

提供图片上传接口，包含安全校验：管理员权限、文件大小、真实文件类型检测、
UUID 文件名生成、禁止 SVG 等可携带脚本的格式。
"""

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.admin_deps import require_role
from app.models.admin import AdminUser

router = APIRouter()

# 允许的图片格式及其 magic bytes（文件头签名）
# 格式: {扩展名: (字节偏移, 魔数字节序列)}
ALLOWED_MAGIC_BYTES = {
    "jpg":  (0, b"\xff\xd8\xff"),
    "jpeg": (0, b"\xff\xd8\xff"),
    "png":  (0, b"\x89PNG\r\n\x1a\n"),
    "gif":  (0, (b"GIF87a", b"GIF89a")),
    "webp": (0, b"RIFF"),
}

# SVG 文件特征（禁止上传）
SVG_SIGNATURES = [
    b"<?xml",
    b"<svg",
    b"<!DOCTYPE svg",
]


def _detect_real_type(content: bytes) -> str | None:
    """通过文件头 magic bytes 检测真实文件类型。

    返回小写扩展名（如 "png"），无法识别返回 None。
    """
    for ext, (offset, magic) in ALLOWED_MAGIC_BYTES.items():
        if isinstance(magic, tuple):
            for m in magic:
                if content[offset:offset + len(m)] == m:
                    return ext
        else:
            if content[offset:offset + len(magic)] == magic:
                return ext
    return None


def _is_svg(content: bytes) -> bool:
    """检测文件内容是否为 SVG 格式。

    通过检查文件前 200 字节是否包含 SVG 特征字符串来判断。
    注意：SVG 文件可能以 XML 声明、DOCTYPE 或直接以 <svg 标签开头。
    """
    head = content[:200].lower()
    return any(sig.lower() in head for sig in SVG_SIGNATURES)


def _validate_webp(content: bytes) -> bool:
    """WebP 文件额外校验：RIFF 容器内必须包含 WEBP 标识。

    标准 WebP 文件结构：RIFF{size}WEBP{chunk}
    仅检查 RIFF 头不够，需要确认偏移 8 处为 "WEBP"。
    """
    return len(content) > 12 and content[8:12] == b"WEBP"


@router.post("/lessons/upload-image")
async def upload_image(
    file: UploadFile,
    current_admin: AdminUser = Depends(require_role("editor")),
):
    """上传教程图片

    安全校验流程：
    1. 校验管理员权限（通过 require_role("editor") 依赖注入）
    2. 限制文件大小（≤ MAX_UPLOAD_SIZE，默认 5MB）
    3. 读取文件头 magic bytes 校验真实类型，不信任浏览器提交的扩展名或 MIME 类型
    4. 仅允许 jpg、png、gif、webp 格式
    5. 禁止 SVG（可携带脚本，存在 XSS 风险）
    6. 服务端生成 UUID 文件名，按日期分目录存储
    7. 返回可公开访问的图片 URL

    Returns:
        JSONResponse: {"url": "/uploads/20260810/abc123def.png"}
    """
    # 1. 校验文件大小
    if file.size is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法获取文件大小",
        )
    if file.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件大小超过限制（最大 {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB）",
        )

    # 2. 读取文件内容用于类型检测
    content = await file.read()

    # 3. 检测是否为 SVG（禁止）
    if _is_svg(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持 SVG 格式（SVG 可携带脚本，存在安全风险）",
        )

    # 4. 检测真实文件类型
    ext = _detect_real_type(content)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法识别的文件类型，仅支持 jpg、png、gif、webp 格式",
        )

    # 5. WebP 额外校验
    if ext == "webp" and not _validate_webp(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的 WebP 文件格式",
        )

    # 6. 生成存储路径：static/uploads/{YYYYMMDD}/{uuid}.{ext}
    date_dir = datetime.now().strftime("%Y%m%d")
    filename = f"{uuid.uuid4().hex}.{ext}"
    relative_dir = Path(date_dir)
    upload_dir = Path(settings.UPLOAD_DIR) / relative_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    # 7. 写入文件
    file_path = upload_dir / filename
    file_path.write_bytes(content)

    # 8. 返回可公开访问的 URL
    url = f"/uploads/{relative_dir.as_posix()}/{filename}"

    return JSONResponse(
        content={"url": url},
        status_code=status.HTTP_201_CREATED,
    )