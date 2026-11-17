from fastapi import FastAPI

from app.auth import router as auth_router
from app.community import router as community_router

app = FastAPI(
    title="StyleMate API",
    version="0.1.0",
)
app.include_router(auth_router)
app.include_router(community_router)


@app.get("/api/v1/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
