"""
Centralized configuration for the Stock-Eye ML service.
"""
import os
from pathlib import Path

# ── Directory Paths ──────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # Stock-Eye/
SRC_DIR = PROJECT_ROOT / "src"
BACKEND_DIR = SRC_DIR / "backend"
DATA_DIR = SRC_DIR / "data"

# ── Database ─────────────────────────────────────────────────────────
# The ML service reads directly from the Postgres database that the web
# app owns (managed by Prisma). Schema is created via Prisma migrations.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://stockeye:stockeye_dev_password@localhost:5432/stockeye",
)

# ── CORS ─────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
]

# ── Detection settings ───────────────────────────────────────────────
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
NMS_THRESHOLD = float(os.getenv("NMS_THRESHOLD", "0.4"))

# ── Upload / export folder ───────────────────────────────────────────
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
