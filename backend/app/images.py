import base64
import binascii
import os
import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from fastapi.responses import FileResponse


upload_dir = Path(os.getenv("STYLEMATE_UPLOAD_DIR", Path(__file__).resolve().parents[1] / "uploads"))
image_pattern = re.compile(r"^data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$")
file_pattern = re.compile(r"^[0-9a-f]{32}\.(png|jpg|webp|gif)$")
extensions = {"png": "png", "jpeg": "jpg", "webp": "webp", "gif": "gif"}
media_types = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "gif": "image/gif"}
max_image_bytes = 1024 * 1024
image_url_prefix = "/api/v1/community/images/"


def store_image(data_url: str | None, created_files: list[Path]) -> str | None:
    if not data_url:
        return None
    match = image_pattern.fullmatch(data_url)
    if not match:
        raise HTTPException(status_code=422, detail="只支持 PNG、JPEG、WebP 或 GIF 图片")
    try:
        data = base64.b64decode(match.group(2), validate=True)
    except binascii.Error:
        raise HTTPException(status_code=422, detail="图片数据无效") from None
    mime = match.group(1)
    valid_header = {
        "png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "jpeg": data.startswith(b"\xff\xd8\xff"),
        "webp": data.startswith(b"RIFF") and data[8:12] == b"WEBP",
        "gif": data.startswith((b"GIF87a", b"GIF89a")),
    }[mime]
    if not data or len(data) > max_image_bytes or not valid_header:
        raise HTTPException(status_code=422, detail="图片格式无效或超过 1 MB")
    upload_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}.{extensions[mime]}"
    path = upload_dir / name
    path.write_bytes(data)
    created_files.append(path)
    return f"{image_url_prefix}{name}"


def image_response(name: str) -> FileResponse:
    if not file_pattern.fullmatch(name):
        raise HTTPException(status_code=404, detail="图片不存在")
    path = upload_dir / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="图片不存在")
    return FileResponse(path, media_type=media_types[name.rsplit(".", 1)[1]])


def delete_image(url: str | None) -> None:
    if not url or not url.startswith(image_url_prefix):
        return
    name = url.removeprefix(image_url_prefix)
    if file_pattern.fullmatch(name):
        (upload_dir / name).unlink(missing_ok=True)
