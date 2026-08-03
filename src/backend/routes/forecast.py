"""
Forecasting API routes (ML service).
"""
from fastapi import APIRouter, HTTPException, Query

from src.backend.services.forecaster import (
    forecast_meta,
    get_item_forecast,
    get_org_forecasts,
)

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("")
def forecast_all(
    org: str = Query(..., description="Organization id"),
    limit: int = Query(200, ge=1, le=500),
):
    """Demand forecast for every item in the org, sorted by risk."""
    return get_org_forecasts(org, limit)


@router.get("/meta")
def forecast_meta_endpoint(org: str = Query(..., description="Organization id")):
    """Model quality summary (backtest accuracy vs naive baseline)."""
    return forecast_meta(org)


@router.get("/{item_id}")
def forecast_one(
    org: str = Query(..., description="Organization id"),
    item_id: str = None,
):
    """Forecast + historical series for a single item (for charts)."""
    result = get_item_forecast(org, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return result
