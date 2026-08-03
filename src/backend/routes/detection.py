"""
Object detection API routes.

The ML service is stateless: it decodes frames, runs YOLOv8, and returns
detections. The web app persists detection history to Postgres.
"""
import base64
import time

import cv2 as cv
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from src.backend.services.detector import detector

router = APIRouter(prefix="/api/detect", tags=["detection"])


class FrameRequest(BaseModel):
    image_base64: str
    filter_classes: str | None = None
    include_annotated: bool = False


@router.post("/frame")
async def detect_frame(payload: FrameRequest):
    """
    Detect objects in a base64-encoded frame (JPEG/PNG).
    Used by the realtime camera and image-upload flows.
    """
    try:
        raw = base64.b64decode(payload.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 payload")

    nparr = np.frombuffer(raw, np.uint8)
    image = cv.imdecode(nparr, cv.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    filters = (
        [x.strip() for x in payload.filter_classes.split(",") if x.strip()]
        if payload.filter_classes
        else None
    )

    start = time.perf_counter()
    try:
        detections, annotated = detector.detect(image, filter_classes=filters)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    latency_ms = round((time.perf_counter() - start) * 1000, 1)

    result = {
        "total_objects": len(detections),
        "detections": detections,
        "latency_ms": latency_ms,
    }

    if payload.include_annotated:
        _, buffer = cv.imencode(".jpg", annotated, [cv.IMWRITE_JPEG_QUALITY, 85])
        result["annotated_image"] = (
            "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")
        )

    return result


@router.post("")
async def detect_objects(
    file: UploadFile = File(...),
    filter_classes: str | None = Form(None),
):
    """Upload an image file and run YOLOv8 object detection."""
    contents = await file.read()
    payload = FrameRequest(
        image_base64=base64.b64encode(contents).decode("utf-8"),
        filter_classes=filter_classes,
        include_annotated=True,
    )
    result = await detect_frame(payload)
    result["image_name"] = file.filename or "upload.jpg"
    return result
