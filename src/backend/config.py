"""
Centralized configuration for Stock-Eye backend.
"""
import os
from pathlib import Path

# ── Directory Paths ──────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # Stock-Eye/
SRC_DIR = PROJECT_ROOT / "src"
BACKEND_DIR = SRC_DIR / "backend"
FRONTEND_DIR = SRC_DIR / "frontend"
DATA_DIR = SRC_DIR / "data"

# ── Database ─────────────────────────────────────────────────────────
DB_PATH = BACKEND_DIR / "stockeye.db"

# ── Inventory CSV seed file ──────────────────────────────────────────
INVENTORY_CSV = PROJECT_ROOT / "inventory"

# ── YOLO model files ─────────────────────────────────────────────────
YOLO_WEIGHTS = DATA_DIR / "yolov3.weights"
YOLO_CFG = DATA_DIR / "yolov3.cfg"
COCO_NAMES = DATA_DIR / "coco.names"

# ── Detection settings ───────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.4
INPUT_SIZE = (416, 416)

# ── Upload folder ────────────────────────────────────────────────────
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
