"""
YOLOv8 object detection service.
"""
import uuid
import numpy as np
import cv2 as cv
from pathlib import Path
from ultralytics import YOLO

from src.backend.config import (
    DATA_DIR, CONFIDENCE_THRESHOLD, NMS_THRESHOLD,
)

YOLO_V8_WEIGHTS = DATA_DIR / "yolov8n.pt"

class ObjectDetector:
    """Encapsulated YOLOv8 detector with ultralytics native inference."""

    def __init__(self):
        self._model = None
        self._loaded = False
        self._class_names_map = {}

    def _load(self):
        """Lazy-load the YOLOv8 model."""
        if self._loaded:
            return

        # ultralytics will auto-download yolov8n.pt if not present in the current dir.
        # We specify the explicit path so it downloads exactly where we want it.
        try:
            self._model = YOLO(str(YOLO_V8_WEIGHTS))
            self._class_names_map = self._model.names
            # Reverse map to find class indices by name for filtering
            self._name_to_id = {v: k for k, v in self._class_names_map.items()}
            self._loaded = True
        except Exception as e:
            raise RuntimeError(f"YOLOv8 initialization failed: {str(e)}. "
                               "Check internet connection for initial model download.")

    def detect(
        self,
        image: np.ndarray,
        filter_classes: list[str] | None = None,
        conf_threshold: float = CONFIDENCE_THRESHOLD,
        nms_threshold: float = NMS_THRESHOLD,
    ) -> tuple[list[dict], np.ndarray]:
        """
        Run detection on an image via YOLOv8. 
        Optionally filter by specific class labels (e.g. ['person', 'bottle']).
        Returns (detections_list, annotated_image).
        """
        self._load()
        
        # Build filter list of class indices if filter_classes provided
        class_filters = None
        if filter_classes:
            class_filters = []
            for name in filter_classes:
                name_lower = name.lower()
                if name_lower in self._name_to_id:
                    class_filters.append(self._name_to_id[name_lower])

        # Run inference using ultralytics
        results = self._model.predict(
            source=image,
            conf=conf_threshold,
            iou=nms_threshold,
            classes=class_filters if class_filters else None,
            verbose=False
        )

        detections = []
        annotated = image.copy()
        
        # In YOLOv8, predict always returns a list of Results objects
        if not results:
            return detections, annotated
            
        result = results[0]
        
        # Iterate over detected boxes
        if result.boxes:
            for box in result.boxes:
                # Convert coords from top-left, bottom-right xyxy to x,y,w,h
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                w = int(x2 - x1)
                h = int(y2 - y1)
                x = int(x1)
                y = int(y1)
                
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = self._class_names_map[cls_id]

                # Draw nicely on the image
                color = (0, 255, 0) # Green box
                cv.rectangle(annotated, (x, y), (x + w, y + h), color, 2)
                cv.putText(
                    annotated,
                    f"{label} {conf:.2f}",
                    (x, y - 8),
                    cv.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    color,
                    2,
                )

                detections.append({
                    "class_label": label,
                    "confidence": round(conf, 4),
                    "bbox": [x, y, w, h]
                })

        return detections, annotated

# Singleton instance
detector = ObjectDetector()
