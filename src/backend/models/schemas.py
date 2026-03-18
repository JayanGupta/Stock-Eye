"""
Pydantic models for request/response validation.
"""
from pydantic import BaseModel


class InventoryItem(BaseModel):
    id: int | None = None
    item: str
    category: str
    quantity: int = 0
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    price: float = 0
    quantity_sold: int = 0
    total_sales: float = 0
    wastage: int = 0
    date_sold: str | None = None


class InventoryCreate(BaseModel):
    item: str
    category: str
    quantity: int = 0
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    price: float = 0
    quantity_sold: int = 0
    total_sales: float = 0
    wastage: int = 0
    date_sold: str | None = None


class InventoryUpdate(BaseModel):
    item: str | None = None
    category: str | None = None
    quantity: int | None = None
    manufacturing_date: str | None = None
    expiry_date: str | None = None
    price: float | None = None
    quantity_sold: int | None = None
    total_sales: float | None = None
    wastage: int | None = None
    date_sold: str | None = None


class Detection(BaseModel):
    class_label: str
    confidence: float
    bbox: list[int]  # [x, y, w, h]


class DetectionResponse(BaseModel):
    image_name: str
    total_objects: int
    detections: list[Detection]


class StatsResponse(BaseModel):
    total_items: int
    total_categories: int
    total_quantity: int
    total_revenue: float
    total_wastage: int
    avg_price: float
