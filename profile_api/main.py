from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx
import psycopg
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field


UTC = timezone.utc
CHAT_API = os.getenv("KGM_CHAT_API", "https://mana-koratlagudem.onrender.com").rstrip("/")
DATABASE_URL = os.getenv("DATABASE_URL", "")
MAX_AVATAR_BYTES = 5 * 1024 * 1024
DEFAULT_AVATAR_PRESET = "orbit-pop"
ALLOWED_AVATAR_PRESETS = {
    "orbit-pop", "cosmic-cat", "neon-alien", "astro-kid", "robo-rave", "dna-glow",
    "pixel-ghost", "brainwave", "frog-mode", "saturn-pop", "lightning-lab", "fire-maker",
    "star-bloom",
}
ALLOWED_ROLES = {"Child", "Teen", "Adult"}

app = FastAPI(title="KGM Profile Avatar API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kgm-playstore.onrender.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class ProfileUpdate(BaseModel):
    nickname: str | None = Field(default=None, min_length=2, max_length=24)
    role: str | None = Field(default=None, min_length=1, max_length=12)
    avatar_preset: str | None = Field(default=None, min_length=2, max_length=40)


def db_conn():
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Profile storage is not configured")
    return psycopg.connect(DATABASE_URL, autocommit=True)


def init_db() -> None:
    if not DATABASE_URL:
        return
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS kgm_profiles (
                user_id TEXT PRIMARY KEY,
                avatar_type TEXT NOT NULL DEFAULT 'preset',
                avatar_preset TEXT,
                avatar_content_type TEXT,
                avatar_bytes BYTEA,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


@app.on_event("startup")
def startup() -> None:
    init_db()


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please sign in to edit your KGM profile")
    return authorization.split(" ", 1)[1].strip()


async def upstream_me(token: str = Depends(bearer_token)) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{CHAT_API}/api/kgm-chat/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Your KGM session has expired")
    return response.json()


def avatar_record(user_id: str) -> dict[str, Any]:
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT avatar_type, avatar_preset, avatar_content_type, updated_at FROM kgm_profiles WHERE user_id = %s",
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        return {"type": "preset", "preset": DEFAULT_AVATAR_PRESET, "url": None}
    avatar_type, preset, _content_type, updated_at = row
    if avatar_type == "upload":
        version = int(updated_at.timestamp()) if isinstance(updated_at, datetime) else 1
        return {"type": "upload", "preset": None, "url": f"/api/kgm-profile/users/{user_id}/avatar?v={version}"}
    selected = preset if preset in ALLOWED_AVATAR_PRESETS else DEFAULT_AVATAR_PRESET
    return {"type": "preset", "preset": selected, "url": None}


def serialize_profile(account: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(account.get("id", "")),
        "email": account.get("email", ""),
        "nickname": account.get("nickname", "Village member"),
        "role": account.get("role", "Adult"),
        "avatar": avatar_record(str(account.get("id", ""))),
        "created_at": account.get("created_at", ""),
    }


def sniff_image(data: bytes) -> str:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    raise HTTPException(status_code=400, detail="Avatar must be JPG, PNG, WebP or GIF")


@app.get("/health")
def health() -> dict[str, str]:
    if not DATABASE_URL:
        return {"status": "degraded", "storage": "not-configured"}
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1")
        cur.fetchone()
    return {"status": "ok", "storage": "postgres"}


@app.get("/api/kgm-profile/presets")
def presets() -> dict[str, Any]:
    return {
        "default": DEFAULT_AVATAR_PRESET,
        "items": sorted(ALLOWED_AVATAR_PRESETS),
        "upload": {"max_bytes": MAX_AVATAR_BYTES, "types": ["image/jpeg", "image/png", "image/webp", "image/gif"]},
    }


@app.get("/api/kgm-profile/me")
def get_profile(account: dict[str, Any] = Depends(upstream_me)) -> dict[str, Any]:
    return serialize_profile(account)


@app.put("/api/kgm-profile/me")
async def update_profile(
    payload: ProfileUpdate,
    token: str = Depends(bearer_token),
    account: dict[str, Any] = Depends(upstream_me),
) -> dict[str, Any]:
    upstream_payload: dict[str, str] = {}
    if payload.nickname is not None:
        upstream_payload["nickname"] = payload.nickname.strip()
    if payload.role is not None:
        if payload.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Choose Child, Teen or Adult")
        upstream_payload["role"] = payload.role

    next_account = account
    if upstream_payload:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.put(
                f"{CHAT_API}/api/kgm-chat/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                json=upstream_payload,
            )
        if response.status_code != 200:
            try:
                detail = response.json().get("detail")
            except Exception:
                detail = None
            raise HTTPException(status_code=response.status_code, detail=detail or "Could not update KGM profile")
        next_account = response.json()

    if payload.avatar_preset is not None:
        preset = payload.avatar_preset.strip().lower()
        if preset not in ALLOWED_AVATAR_PRESETS:
            raise HTTPException(status_code=400, detail="Choose one of the KGM avatar presets")
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO kgm_profiles(user_id, avatar_type, avatar_preset, avatar_content_type, avatar_bytes, updated_at)
                VALUES (%s, 'preset', %s, NULL, NULL, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    avatar_type='preset', avatar_preset=EXCLUDED.avatar_preset,
                    avatar_content_type=NULL, avatar_bytes=NULL, updated_at=NOW()
                """,
                (str(account["id"]), preset),
            )

    return serialize_profile(next_account)


@app.post("/api/kgm-profile/me/avatar", status_code=status.HTTP_201_CREATED)
async def upload_avatar(
    file: UploadFile = File(...),
    account: dict[str, Any] = Depends(upstream_me),
) -> dict[str, Any]:
    data = await file.read(MAX_AVATAR_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Choose an avatar image first")
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Avatar images must be 5 MB or smaller")
    content_type = sniff_image(data)
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO kgm_profiles(user_id, avatar_type, avatar_preset, avatar_content_type, avatar_bytes, updated_at)
            VALUES (%s, 'upload', NULL, %s, %s, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                avatar_type='upload', avatar_preset=NULL,
                avatar_content_type=EXCLUDED.avatar_content_type,
                avatar_bytes=EXCLUDED.avatar_bytes, updated_at=NOW()
            """,
            (str(account["id"]), content_type, data),
        )
    return serialize_profile(account)


@app.delete("/api/kgm-profile/me/avatar")
def reset_avatar(account: dict[str, Any] = Depends(upstream_me)) -> dict[str, Any]:
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO kgm_profiles(user_id, avatar_type, avatar_preset, avatar_content_type, avatar_bytes, updated_at)
            VALUES (%s, 'preset', %s, NULL, NULL, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                avatar_type='preset', avatar_preset=EXCLUDED.avatar_preset,
                avatar_content_type=NULL, avatar_bytes=NULL, updated_at=NOW()
            """,
            (str(account["id"]), DEFAULT_AVATAR_PRESET),
        )
    return serialize_profile(account)


@app.get("/api/kgm-profile/users/{user_id}/avatar")
def public_avatar(user_id: str) -> Response:
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT avatar_content_type, avatar_bytes FROM kgm_profiles WHERE user_id = %s AND avatar_type='upload'",
            (user_id,),
        )
        row = cur.fetchone()
    if not row or not row[1]:
        raise HTTPException(status_code=404, detail="Avatar not found")
    content_type, data = row
    return Response(
        content=bytes(data),
        media_type=content_type or "image/jpeg",
        headers={
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            "X-Content-Type-Options": "nosniff",
        },
    )
