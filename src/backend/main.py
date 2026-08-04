"""
Stock-Eye ML service (FastAPI).

Runs alongside the Next.js web app and provides the ML workloads:
object detection (YOLOv8), demand forecasting (gradient boosting with
walk-forward backtesting) and invoice PDF generation. It is stateless
and reads the Postgres schema owned by the web app.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.backend.config import CORS_ORIGINS
from src.backend.routes import billing, detection, forecast

app = FastAPI(
    title="Stock-Eye ML API",
    description="YOLOv8 detection, demand forecasting, invoice generation.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router)
app.include_router(forecast.router)
app.include_router(billing.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "stock-eye-ml"}
