"""
Stock-Eye FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from src.backend.config import FRONTEND_DIR
from src.backend.database import init_db
from src.backend.seed import seed_inventory
from src.backend.routes import inventory, detection, analytics

app = FastAPI(
    title="Stock-Eye API",
    description="Intelligent Warehouse Inventory System",
    version="2.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ───────────────────────────────────────────────────────
app.include_router(inventory.router)
app.include_router(detection.router)
app.include_router(analytics.router)

# ── Static files (frontend) ─────────────────────────────────────────
app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")


@app.get("/")
async def serve_frontend():
    """Serve the main dashboard HTML."""
    return FileResponse(str(FRONTEND_DIR / "index.html"))


# ── Startup ──────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    """Initialize database and seed data on first run."""
    init_db()
    seed_inventory()
    print("[OK] Stock-Eye backend ready!")
