"""
Pydantic models for request/response validation.
"""
from pydantic import BaseModel
from typing import Optional, List


class InventoryItem(BaseModel):
    id: Optional[int] = None
    item: str
    category: str
    quantity: int = 0
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    price: float = 0
    quantity_sold: int = 0
    total_sales: float = 0
    wastage: int = 0
    date_sold: Optional[str] = None


class InventoryCreate(BaseModel):
    item: str
    category: str
    quantity: int = 0
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    price: float = 0
    quantity_sold: int = 0
    total_sales: float = 0
    wastage: int = 0
    date_sold: Optional[str] = None


class InventoryUpdate(BaseModel):
    item: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    price: Optional[float] = None
    quantity_sold: Optional[int] = None
    total_sales: Optional[float] = None
    wastage: Optional[int] = None
    date_sold: Optional[str] = None


class Detection(BaseModel):
    class_label: str
    confidence: float
    bbox: List[int]  # [x, y, w, h]


class DetectionResponse(BaseModel):
    image_name: str
    total_objects: int
    detections: List[Detection]


class StatsResponse(BaseModel):
    total_items: int
    total_categories: int
    total_quantity: int
    total_revenue: float
    total_wastage: int
    avg_price: float
