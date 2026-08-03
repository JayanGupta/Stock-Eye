"""
Demand forecasting service using machine learning.

Approach
--------
For every item we build a daily demand series from the sales ledger, then
train a gradient-boosting model on engineered features (calendar + lagged +
rolling statistics). Accuracy is measured with a *walk-forward* backtest:
the model is trained repeatedly on the past and evaluated on held-out
windows, always compared against a naive persistence baseline so the
reported "improvement" is honest.

For items with sparse history the model is skipped and a statistical
baseline (mean demand with seasonal adjustment) is used instead. The method
used is reported per item so the UI never overstates what happened.
"""
from __future__ import annotations

import time
from functools import lru_cache

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from src.backend.config import CONFIDENCE_THRESHOLD
from src.backend.db import query

FORECAST_HORIZON_DAYS = 90
WALK_FORWARD_STEPS = 4
MIN_ML_POINTS = 42  # ~6 weeks of daily history before ML is used
CACHE_TTL_SECONDS = 10 * 60


# ── Data loading ──────────────────────────────────────────────────────
def _daily_series(item_id: str) -> pd.DataFrame:
    """Return a daily demand DataFrame (index=date, value=units) for an item."""
    rows = query(
        """
        SELECT "soldAt", quantity
        FROM "SaleItem"
        WHERE "itemId" = %s
        ORDER BY "soldAt" ASC
        """,
        (item_id,),
    )
    if not rows:
        return pd.DataFrame(columns=["date", "units"])
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["soldAt"]).dt.date
    daily = df.groupby("date")["quantity"].sum().astype(float)
    full = daily.asfreq("D", fill_value=0.0)
    return full.reset_index().rename(columns={"index": "date", "quantity": "units"})


def _load_items(org_id: str) -> list[dict]:
    rows = query(
        """
        SELECT id, name, category, quantity, "unitPrice", "reorderPoint"
        FROM "InventoryItem"
        WHERE "organizationId" = %s
        ORDER BY name ASC
        """,
        (org_id,),
    )
    return rows


# ── Feature engineering ───────────────────────────────────────────────
def _build_features(series: pd.Series) -> pd.DataFrame:
    """Engineer features from a daily units series."""
    df = pd.DataFrame({"units": series})
    df["dayofweek"] = df.index.dayofweek
    df["dayofmonth"] = df.index.day
    df["month"] = df.index.month
    df["lag1"] = df["units"].shift(1).fillna(0)
    df["lag7"] = df["units"].shift(7).fillna(0)
    df["lag14"] = df["units"].shift(14).fillna(0)
    df["roll7"] = df["units"].rolling(7).mean().fillna(df["units"].mean())
    df["roll14"] = df["units"].rolling(14).mean().fillna(df["units"].mean())
    df["roll30"] = df["units"].rolling(30).mean().fillna(df["units"].mean())
    df["roll7_std"] = df["units"].rolling(7).std().fillna(0)
    return df


FEATURES = [
    "dayofweek",
    "dayofmonth",
    "month",
    "lag1",
    "lag7",
    "lag14",
    "roll7",
    "roll14",
    "roll30",
    "roll7_std",
]


# ── Backtest ──────────────────────────────────────────────────────────
def _walk_forward_backtest(series: pd.Series, horizon: int) -> dict | None:
    """
    Walk-forward evaluation vs a naive persistence baseline.

    Trains on growing windows and evaluates on the next `horizon` days.
    Returns backtest metrics or None when there is not enough data.
    """
    n = len(series)
    min_train = 21
    if n < min_train + horizon:
        return None

    steps = min(WALK_FORWARD_STEPS, (n - min_train) // horizon)
    if steps < 1:
        return None

    y_true, y_pred, y_naive = [], [], []
    for s in range(steps):
        split = n - (steps - s) * horizon
        train = series.iloc[:split]
        test = series.iloc[split : split + horizon]
        if len(train) < min_train or len(test) < horizon:
            continue

        X = _build_features(train).iloc[1:][FEATURES]
        y = train.iloc[1:]
        if len(X) < 10:
            continue

        model = GradientBoostingRegressor(
            n_estimators=120,
            learning_rate=0.08,
            max_depth=3,
            random_state=42,
        )
        model.fit(X, y)

        future = _build_features(train)
        # Recursive one-step-ahead forecast using predictions as lag input.
        preds = []
        for _ in range(horizon):
            row = future.iloc[-1].copy()
            x = row[FEATURES].to_frame().T
            p = max(0.0, float(model.predict(x)[0]))
            preds.append(p)
            future = _build_features(pd.concat([future["units"], pd.Series([p])]))
        preds = np.array(preds)

        # Persistence baseline: last observed value repeated forward.
        naive = np.full(horizon, train.iloc[-1])

        y_true.extend(test.tolist())
        y_pred.extend(preds.tolist())
        y_naive.extend(naive.tolist())

    if not y_true:
        return None

    true = np.array(y_true)
    pred = np.array(y_pred)
    naive = np.array(y_naive)

    mae = mean_absolute_error(true, pred)
    naive_mae = mean_absolute_error(true, naive)
    mape = float(np.mean(np.abs((true + 1e-6 - pred) / (true + 1e-6)))) * 100.0
    naive_mape = float(
        np.mean(np.abs((true + 1e-6 - naive) / (true + 1e-6)))
    ) * 100.0
    rmse = float(np.sqrt(mean_squared_error(true, pred)))

    improvement = 0.0
    if naive_mae > 1e-9:
        improvement = (naive_mae - mae) / naive_mae * 100.0

    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "mape": round(mape, 1),
        "naive_mae": round(naive_mae, 3),
        "naive_mape": round(naive_mape, 1),
        "improvement_pct": round(improvement, 1),
        "folds": steps,
    }


# ── Forecasting ───────────────────────────────────────────────────────
def _forecast_item(item: dict, horizon: int) -> dict:
    df = _daily_series(item["id"])
    series = pd.Series(df["units"].values, index=pd.to_datetime(df["date"]))

    current_stock = int(item["quantity"])
    daily = 0.0
    confidence = 0.0
    method = "insufficient_data"
    backtest = None
    forecast_units = []

    if len(series) >= 3:
        mean_demand = float(series[series > 0].mean()) if (series > 0).any() else 0.0

        if len(series) >= MIN_ML_POINTS:
            bt = _walk_forward_backtest(series, horizon=14)
            if bt and bt["folds"] >= 2:
                backtest = bt
                method = "gradient_boosting"
                model = GradientBoostingRegressor(
                    n_estimators=150,
                    learning_rate=0.08,
                    max_depth=3,
                    random_state=42,
                )
                feats = _build_features(series)
                model.fit(feats.iloc[1:][FEATURES], series.iloc[1:])

                future_units = series.copy()
                preds = []
                for _ in range(horizon):
                    row = _build_features(future_units).iloc[-1][FEATURES].to_frame().T
                    p = max(0.0, float(model.predict(row)[0]))
                    preds.append(p)
                    future_units = pd.concat([future_units, pd.Series([p])])
                forecast_units = preds

                # Confidence scaled by backtest accuracy vs baseline.
                score = max(0.0, min(1.0, bt["improvement_pct"] / 30.0))
                confidence = round(50.0 + score * 45.0, 1)
                daily = float(np.mean(preds))
        else:
            method = "seasonal_baseline"
            # Seasonal baseline: average of same-weekday recent demand.
            weekdays = series.groupby(series.index.dayofweek).mean()
            daily = float(weekdays.mean()) if len(weekdays) else mean_demand
            confidence = 55.0
            forecast_units = [daily] * horizon

    if daily <= 0:
        daily = 0.1
        confidence = max(confidence, 35.0)

    projected = daily * horizon
    days_remaining = current_stock / daily if daily > 0 else float("inf")
    recommended = max(0.0, projected - current_stock)

    if days_remaining <= 15:
        risk = "critical"
    elif days_remaining <= 45:
        risk = "warning"
    else:
        risk = "safe"

    return {
        "id": item["id"],
        "name": item["name"],
        "category": item["category"],
        "current_stock": current_stock,
        "unit_price": round(float(item["unitPrice"]), 2),
        "daily_demand": round(daily, 2),
        "next_30_days": round(daily * 30, 0),
        "next_90_days": round(projected, 0),
        "days_remaining": round(days_remaining, 1),
        "risk_level": risk,
        "recommended_restock": round(recommended, 0),
        "confidence": confidence,
        "method": method,
        "backtest": backtest,
        "forecast_units": [round(u, 1) for u in forecast_units],
    }


# ── Caching ───────────────────────────────────────────────────────────
_cache: dict[str, tuple[float, list[dict]]] = {}


def get_org_forecasts(org_id: str, limit: int = 200) -> list[dict]:
    """Forecast every item in an org, cached for a few minutes."""
    now = time.time()
    cached = _cache.get(org_id)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1][:limit]

    items = _load_items(org_id)
    forecasts = [_forecast_item(it, FORECAST_HORIZON_DAYS) for it in items]

    risk_order = {"critical": 0, "warning": 1, "safe": 2}
    forecasts.sort(key=lambda f: (risk_order[f["risk_level"]], f["days_remaining"]))

    _cache[org_id] = (now, forecasts)
    return forecasts[:limit]


def get_item_forecast(org_id: str, item_id: str) -> dict | None:
    """Forecast for a single item plus its historical series for charting."""
    all_items = get_org_forecasts(org_id)
    forecast = next((f for f in all_items if f["id"] == item_id), None)
    if forecast is None:
        return None

    df = _daily_series(item_id)
    history = [
        {"date": str(d), "units": float(u)}
        for d, u in zip(df["date"], df["units"])
    ]
    forecast["history"] = history
    return forecast


def forecast_meta(org_id: str) -> dict:
    """Aggregate backtest quality across the org's items."""
    items = get_org_forecasts(org_id)
    ml = [i for i in items if i["backtest"]]
    if not ml:
        return {
            "model": "insufficient_data",
            "items_ml": 0,
            "items_total": len(items),
            "avg_improvement_pct": 0.0,
            "avg_mape": None,
        }

    avg_improvement = float(np.mean([i["backtest"]["improvement_pct"] for i in ml]))
    avg_mape = float(np.mean([i["backtest"]["mape"] for i in ml]))
    return {
        "model": "gradient_boosting",
        "items_ml": len(ml),
        "items_total": len(items),
        "avg_improvement_pct": round(avg_improvement, 1),
        "avg_mape": round(avg_mape, 1),
        "horizon_days": FORECAST_HORIZON_DAYS,
    }
