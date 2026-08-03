"""
Object detection API routes.
"""
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from src.backend.database import get_db

router = APIRouter(prefix="/api/detect", tags=["detection"])


@router.post("")
async def detect_objects(
    file: UploadFile = File(...),
    filter_classes: str | None = Form(None)
):
    """
    Upload an image and run YOLOv8 object detection.
    Optionally pass comma-separated test classes in 'filter_classes'.
    Returns detected objects and a base64-encoded annotated image.
    """
    try:
        import cv2 as cv
        import numpy as np
        from src.backend.services.detector import detector
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Detection service unavailable. Ensure OpenCV is installed and YOLOv8 is configured.",
        )

    # Read uploaded image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv.imdecode(nparr, cv.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Run detection
    try:
        filters = [x.strip() for x in filter_classes.split(',')] if filter_classes else None
        detections, annotated = detector.detect(image, filter_classes=filters)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Encode annotated image as base64 JPEG
    _, buffer = cv.imencode(".jpg", annotated)
    img_base64 = base64.b64encode(buffer).decode("utf-8")

    # Save detections to database
    with get_db() as conn:
        for d in detections:
            conn.execute(
                """INSERT INTO detections
                   (image_name, class_label, confidence, bbox_x, bbox_y, bbox_w, bbox_h)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    file.filename,
                    d["class_label"],
                    d["confidence"],
                    d["bbox"][0], d["bbox"][1], d["bbox"][2], d["bbox"][3],
                ),
            )

    return {
        "image_name": file.filename,
        "total_objects": len(detections),
        "detections": detections,
        "annotated_image": f"data:image/jpeg;base64,{img_base64}",
    }


@router.get("/history")
def detection_history():
    """Return past detection records."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT image_name, timestamp, class_label, confidence,
                      bbox_x, bbox_y, bbox_w, bbox_h
               FROM detections ORDER BY timestamp DESC LIMIT 100"""
        ).fetchall()
        return [dict(r) for r in rows]
