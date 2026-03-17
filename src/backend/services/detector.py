"""
YOLOv3 object detection service.
"""
import cv2 as cv
import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional
from src.backend.config import (
    YOLO_WEIGHTS, YOLO_CFG, COCO_NAMES,
    CONFIDENCE_THRESHOLD, NMS_THRESHOLD, INPUT_SIZE,
)


class ObjectDetector:
    """Encapsulated YOLOv3 detector with configurable thresholds."""

    def __init__(self):
        self._net = None
        self._classes: List[str] = []
        self._output_layers: List[str] = []
        self._loaded = False

    def _load(self):
        """Lazy-load the YOLO model."""
        if self._loaded:
            return

        if not Path(YOLO_WEIGHTS).exists():
            raise FileNotFoundError(
                f"YOLOv3 weights not found at {YOLO_WEIGHTS}. "
                "Please download yolov3.weights and place it in src/data/"
            )

        self._net = cv.dnn.readNet(str(YOLO_WEIGHTS), str(YOLO_CFG))

        with open(str(COCO_NAMES), "r") as f:
            self._classes = [line.strip() for line in f.readlines()]

        layer_names = self._net.getLayerNames()
        self._output_layers = [
            layer_names[i - 1] for i in self._net.getUnconnectedOutLayers()
        ]
        self._loaded = True

    def detect(
        self,
        image: np.ndarray,
        filter_classes: Optional[List[str]] = None,
        conf_threshold: float = CONFIDENCE_THRESHOLD,
        nms_threshold: float = NMS_THRESHOLD,
    ) -> Tuple[List[dict], np.ndarray]:
        """
        Run detection on an image. Optionally filter by specific class labels (e.g. ['person', 'car']).
        Returns (detections_list, annotated_image).
        """
        self._load()

        height, width = image.shape[:2]
        blob = cv.dnn.blobFromImage(
            image, 0.00392, INPUT_SIZE, (0, 0, 0), True, crop=False
        )
        self._net.setInput(blob)
        outs = self._net.forward(self._output_layers)

        class_ids, confidences, boxes = [], [], []

        for out in outs:
            for detection in out:
                scores = detection[5:]
                class_id = int(np.argmax(scores))
                confidence = float(scores[class_id])
                if confidence > conf_threshold:
                    label = self._classes[class_id]
                    # Skip if we are filtering classes and this label isn't requested
                    if filter_classes and label not in filter_classes:
                        continue
                        
                    cx = int(detection[0] * width)
                    cy = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    x = int(cx - w / 2)
                    y = int(cy - h / 2)
                    boxes.append([x, y, w, h])
                    confidences.append(confidence)
                    class_ids.append(class_id)

        indexes = cv.dnn.NMSBoxes(boxes, confidences, conf_threshold, nms_threshold)
        indexes = indexes.flatten() if len(indexes) > 0 else []

        detections = []
        colors = np.random.uniform(0, 255, size=(len(self._classes), 3))
        annotated = image.copy()

        for i in indexes:
            x, y, w, h = boxes[i]
            label = self._classes[class_ids[i]]
            color = colors[class_ids[i]].tolist()
            conf = confidences[i]

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
                "bbox": [x, y, w, h],
            })

        return detections, annotated


# Singleton instance
detector = ObjectDetector()
