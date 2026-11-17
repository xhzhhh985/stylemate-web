import base64
import binascii
import os
import re
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import current_user
from app.database import get_db
from app.models import CommunityOutfit, User


router = APIRouter(prefix="/api/v1/community", tags=["community"])
upload_dir = Path(os.getenv("STYLEMATE_UPLOAD_DIR", Path(__file__).resolve().parents[1] / "uploads"))
image_pattern = re.compile(r"^data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$")
file_pattern = re.compile(r"^[0-9a-f]{32}\.(png|jpg|webp|gif)$")
extensions = {"png": "png", "jpeg": "jpg", "webp": "webp", "gif": "gif"}
media_types = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "gif": "image/gif"}
max_image_bytes = 1024 * 1024


class GarmentInput(BaseModel):
    id: int
    name: str = Field(min_length=1, max_length=50)
    category: str = Field(min_length=1, max_length=20)
    color: str = Field(min_length=1, max_length=20)
    season: str = Field(min_length=1, max_length=10)
    style: str = Field(min_length=1, max_length=30)
    tone: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    surface: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    imageUrl: str | None = Field(default=None, max_length=1_500_000)


class OutfitInput(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    scene: str = Field(min_length=1, max_length=30)
    season: str = Field(min_length=1, max_length=10)
    color: str | None = Field(default=None, max_length=20)
    style: str | None = Field(default=None, max_length=30)
    description: str = Field(default="", max_length=300)
    imageUrl: str | None = Field(default=None, max_length=1_500_000)
    garments: list[GarmentInput] = Field(default_factory=list, max_length=12)

    @field_validator("title", "scene")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("内容不能为空")
        return value


class PublicOutfit(BaseModel):
    id: int
    ownerId: int
    author: str
    title: str
    scene: str
    season: str
    color: str | None
    style: str | None
    description: str
    imageUrl: str | None
    garments: list[dict]
    createdAt: datetime


def public_outfit(outfit: CommunityOutfit) -> PublicOutfit:
    return PublicOutfit(
        id=outfit.id,
        ownerId=outfit.user_id,
        author=outfit.user.profile.nickname,
        title=outfit.title,
        scene=outfit.scene,
        season=outfit.season,
        color=outfit.color,
        style=outfit.style,
        description=outfit.description,
        imageUrl=outfit.image_url,
        garments=outfit.garments,
        createdAt=outfit.created_at,
    )


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
    return f"/api/v1/community/images/{name}"


@router.post("/outfits", response_model=PublicOutfit, status_code=201)
def publish_outfit(body: OutfitInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> PublicOutfit:
    if not body.imageUrl and len(body.garments) < 2:
        raise HTTPException(status_code=422, detail="请上传整套照片，或至少标注两件衣物")
    created_files: list[Path] = []
    try:
        image_url = store_image(body.imageUrl, created_files)
        garments = []
        for garment in body.garments:
            item = garment.model_dump()
            item["imageUrl"] = store_image(garment.imageUrl, created_files)
            garments.append(item)
        outfit = CommunityOutfit(
            user_id=user.id,
            title=body.title,
            scene=body.scene,
            season=body.season,
            color=body.color,
            style=body.style,
            description=body.description,
            image_url=image_url,
            garments=garments,
        )
        db.add(outfit)
        db.commit()
        db.refresh(outfit)
        return public_outfit(outfit)
    except Exception:
        db.rollback()
        for path in created_files:
            path.unlink(missing_ok=True)
        raise


@router.get("/outfits", response_model=list[PublicOutfit])
def list_outfits(limit: int = Query(default=100, ge=1, le=100), db: Session = Depends(get_db)) -> list[PublicOutfit]:
    rows = db.scalars(
        select(CommunityOutfit)
        .options(selectinload(CommunityOutfit.user).selectinload(User.profile))
        .order_by(CommunityOutfit.id.desc())
        .limit(limit)
    ).all()
    return [public_outfit(row) for row in rows]


@router.get("/images/{name}")
def get_image(name: str) -> FileResponse:
    if not file_pattern.fullmatch(name):
        raise HTTPException(status_code=404, detail="图片不存在")
    path = upload_dir / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="图片不存在")
    return FileResponse(path, media_type=media_types[name.rsplit(".", 1)[1]])
