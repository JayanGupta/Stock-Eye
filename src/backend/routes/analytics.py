"""
Sales analytics and forecasting API routes.
"""
from fastapi import APIRouter, Query
from src.backend.services.forecaster import (
    get_monthly_sales,
    get_top_items,
    get_category_breakdown,
    get_demand_forecast,
    get_wastage_analysis,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/sales")
def sales_trends():
    """Monthly sales aggregation."""
    return get_monthly_sales()


@router.get("/top-items")
def top_items(limit: int = Query(10, ge=1, le=50)):
    """Top-selling items by revenue."""
    return get_top_items(limit)


@router.get("/categories")
def categories():
    """Category-level breakdown."""
    return get_category_breakdown()


@router.get("/forecast")
def forecast():
    """Demand forecast for all items."""
    return get_demand_forecast()


@router.get("/wastage")
def wastage():
    """Wastage analysis by category."""
    return get_wastage_analysis()
