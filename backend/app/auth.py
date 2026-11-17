import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserProfile


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
password_hash = PasswordHash.recommended()
dummy_hash = password_hash.hash("not-a-real-user-password")
cookie_name = "stylemate_session"
session_seconds = 24 * 60 * 60
is_production = os.getenv("APP_ENV", "development").lower() == "production"
secret_key = os.getenv("AUTH_SECRET_KEY") or secrets.token_urlsafe(48)
if is_production and len(secret_key) < 32:
    raise RuntimeError("AUTH_SECRET_KEY must contain at least 32 characters in production")


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    nickname: str = Field(min_length=1, max_length=50)

    @field_validator("nickname")
    @classmethod
    def valid_nickname(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("昵称不能为空")
        return value


class LoginRequest(BaseModel):
    username: str
    password: str


class NicknameRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=50)

    @field_validator("nickname")
    @classmethod
    def valid_nickname(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("昵称不能为空")
        return value


class PublicUser(BaseModel):
    id: int
    username: str
    nickname: str
    created_at: datetime


def public_user(user: User) -> PublicUser:
    return PublicUser(
        id=user.id,
        username=user.username,
        nickname=user.profile.nickname,
        created_at=user.created_at,
    )


def set_session(response: Response, user_id: int) -> None:
    expires = datetime.now(timezone.utc) + timedelta(seconds=session_seconds)
    token = jwt.encode({"sub": str(user_id), "exp": expires}, secret_key, algorithm="HS256")
    response.set_cookie(
        key=cookie_name,
        value=token,
        max_age=session_seconds,
        path="/api/v1",
        httponly=True,
        secure=is_production,
        samesite="lax",
    )


def current_user(
    session_token: str | None = Cookie(default=None, alias=cookie_name),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    if not session_token:
        raise unauthorized
    try:
        payload = jwt.decode(session_token, secret_key, algorithms=["HS256"], options={"require": ["sub", "exp"]})
        user_id = int(payload["sub"])
    except (InvalidTokenError, ValueError, TypeError):
        raise unauthorized from None
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise unauthorized
    return user


@router.post("/register", response_model=PublicUser, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> PublicUser:
    username = body.username.lower()
    if db.scalar(select(User.id).where(User.username == username)) is not None:
        raise HTTPException(status_code=409, detail="用户名已被使用")
    user = User(username=username, password_hash=password_hash.hash(body.password))
    user.profile = UserProfile(nickname=body.nickname, preferred_styles=[])
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="用户名已被使用") from None
    db.refresh(user)
    set_session(response, user.id)
    return public_user(user)


@router.post("/login", response_model=PublicUser)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)) -> PublicUser:
    user = db.scalar(select(User).where(User.username == body.username.lower()))
    if not user:
        password_hash.verify(body.password, dummy_hash)
    if not user or not user.is_active or not password_hash.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    set_session(response, user.id)
    return public_user(user)


@router.get("/me", response_model=PublicUser)
def me(user: User = Depends(current_user)) -> PublicUser:
    return public_user(user)


@router.patch("/me", response_model=PublicUser)
def update_me(body: NicknameRequest, db: Session = Depends(get_db), user: User = Depends(current_user)) -> PublicUser:
    user.profile.nickname = body.nickname
    db.commit()
    db.refresh(user)
    return public_user(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(key=cookie_name, path="/api/v1", secure=is_production, httponly=True, samesite="lax")
