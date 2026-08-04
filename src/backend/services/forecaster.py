"""
Demand forecasting service using a global machine-learning model.

Approach
--------
Daily demand for many SKUs is intermittent, so sales are aggregated into
*weekly* buckets. Instead of fitting one model per item (slow and noisy for
small histories) we train a single *global* gradient-boosting model on the
pooled weekly observations of every item. Each item contributes its own
lagged / rolling / seasonal features plus shared attributes (category,
price). The same model then forecasts every item.

Accuracy is measured with a *walk-forward* backtest: the model is retrained
on the past and evaluated on held-out weeks across all items, always
compared against a naive persistence baseline so the reported
"improvement" is honest.

Weekly forecasts are converted to daily demand for stock-out and restock
recommendations. Items with sparse history fall back to a seasonal
baseline. The method used is reported per item.
"""
from __future__ import annotations

import time

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder

from src.backend.db import query

FORECAST_WEEKS = 13  # ~90 days
BACKTEST_HORIZON_WEEKS = 4
MIN_ML_WEEKS = 12
CACHE_TTL_SECONDS = 10 * 60

# ── Data loading ──────────────────────────────────────────────────────
def _weekly_series(item_id: str) -> pd.DataFrame:
    """Return weekly sales totals (index=week start date) for an item."""
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
    df["date"] = pd.to_datetime(df["soldAt"])
    daily = df.groupby(df["date"].dt.to_period("D"))["quantity"].sum().astype(float)
    daily.index = daily.index.to_timestamp()
    weekly = daily.resample("W").sum()
    return weekly.reset_index().rename(columns={"index": "date", "quantity": "units"})


def _load_items(org_id: str) -> list[dict]:
    return query(
        """
        SELECT id, name, category, quantity, "unitPrice", "reorderPoint"
        FROM "InventoryItem"
        WHERE "organizationId" = %s
        ORDER BY name ASC
        """,
        (org_id,),
    )


# ── Feature engineering (weekly, per item) ────────────────────────────
def _build_features(series: pd.Series) -> pd.DataFrame:
    df = pd.DataFrame({"units": series})
    df["weekofyear"] = df.index.isocalendar().week.astype(int)
    df["quarter"] = df.index.quarter
    df["lag1"] = df["units"].shift(1).fillna(0)
    df["lag2"] = df["units"].shift(2).fillna(0)
    df["lag4"] = df["units"].shift(4).fillna(0)
    df["roll4"] = df["units"].rolling(4).mean().fillna(df["units"].mean())
    df["roll8"] = df["units"].rolling(8).mean().fillna(df["units"].mean())
    df["roll8_std"] = df["units"].rolling(8).std().fillna(0)
    df["last_nz"] = df["units"].where(df["units"] > 0).ffill().fillna(0)
    return df


TIME_FEATURES = [
    "weekofyear",
    "quarter",
    "lag1",
    "lag2",
    "lag4",
    "roll4",
    "roll8",
    "roll8_std",
    "last_nz",
]
ITEM_FEATURES = ["category_enc", "price_scale"]
ALL_FEATURES = TIME_FEATURES + ITEM_FEATURES


def _build_panel(items: list[dict]) -> pd.DataFrame:
    """Pooled weekly panel across all items with features attached."""
    parts = []
    for it in items:
        df = _weekly_series(it["id"])
        if df.empty:
            continue
        df = df.copy()
        df["item_id"] = it["id"]
        df["category"] = it["category"]
        df["price"] = float(it["unitPrice"])
        parts.append(df)
    if not parts:
        return pd.DataFrame()
    return pd.concat(parts, ignore_index=True)


def _panel_with_features(panel: pd.DataFrame, enc: LabelEncoder, price_mean: float):
    panel = panel.sort_values(["item_id", "date"]).copy()
    feature_rows = []
    for _item_id, grp in panel.groupby("item_id"):
        grp = grp.sort_values("date").set_index("date")
        feats = _build_features(grp["units"])
        feats["item_id"] = grp["item_id"].iloc[0]
        feats["category"] = grp["category"].iloc[0]
        feats["price"] = grp["price"].iloc[0]
        feats["units"] = grp["units"]
        feature_rows.append(feats.reset_index())
    out = pd.concat(feature_rows, ignore_index=True)
    out["category_enc"] = enc.transform(out["category"])
    out["price_scale"] = out["price"] / price_mean
    return out


def _fit_encoders(panel: pd.DataFrame) -> tuple[LabelEncoder, float]:
    enc = LabelEncoder()
    enc.fit(panel["category"].unique())
    price_mean = float(panel["price"].mean()) or 1.0
    return enc, price_mean


# ── Backtest (global, walk-forward) ───────────────────────────────────
def _walk_forward_backtest(panel: pd.DataFrame, enc: LabelEncoder, price_mean: float, horizon: int) -> dict | None:
    data = _panel_with_features(panel, enc, price_mean)
    if len(data) < 20:
        return None

    # Global relative week index so splits align across items.
    week = (data["date"] - data["date"].min()).dt.days // 7
    data["week"] = week

    n_weeks = int(week.max())
    steps = min(4, max(0, (n_weeks - 8) // horizon))
    if steps < 1:
        return None

    y_true: list[float] = []
    y_pred: list[float] = []
    y_naive: list[float] = []

    for s in range(steps):
        train_end = n_weeks - (steps - s) * horizon
        test_start = train_end
        test_end = test_start + horizon

        train = data[data["week"] < train_end]
        test = data[(data["week"] >= test_start) & (data["week"] < test_end)]
        if train.empty or test.empty:
            continue

        # Drop the first row of every item (no lag features yet).
        model = GradientBoostingRegressor(
            n_estimators=120, learning_rate=0.08, max_depth=3, random_state=42
        )
        X = train[ALL_FEATURES]
        y = train["units"]
        if len(X) < 10:
            continue
        model.fit(X.values, y.values)

        # Forecast per item recursively (history strictly before the split).
        for item_id, grp in test.groupby("item_id"):
            item_hist = data[(data["item_id"] == item_id) & (data["week"] < test_start)]
            if item_hist.empty:
                continue
            item_hist = item_hist.sort_values("date")
            s_series = item_hist.set_index("date")["units"]
            cat = item_hist["category"].iloc[0]
            price = item_hist["price"].iloc[0]

            preds = _recursive_forecast(model, s_series, cat, price, enc, price_mean, horizon)
            actuals = grp["units"].tolist()
            y_true.extend(actuals)
            y_pred.extend(preds[: len(actuals)])
            y_naive.extend([float(s_series.iloc[-1])] * len(actuals))

    if not y_true:
        return None

    true = np.array(y_true)
    pred = np.array(y_pred)
    naive = np.array(y_naive)
    n = min(len(true), len(pred), len(naive))
    true, pred, naive = true[:n], pred[:n], naive[:n]

    mae = mean_absolute_error(true, pred)
    naive_mae = mean_absolute_error(true, naive)
    denom = np.sum(np.abs(true)) + 1e-9
    wmape = float(np.sum(np.abs(true - pred)) / denom) * 100.0
    naive_wmape = float(np.sum(np.abs(true - naive)) / denom) * 100.0
    rmse = float(np.sqrt(mean_squared_error(true, pred)))

    improvement = 0.0
    if naive_mae > 1e-9:
        improvement = (naive_mae - mae) / naive_mae * 100.0

    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "wmape": round(wmape, 1),
        "naive_mae": round(naive_mae, 3),
        "naive_wmape": round(naive_wmape, 1),
        "improvement_pct": round(improvement, 1),
        "folds": steps,
        "samples": n,
    }


def _last_row_features(units: np.ndarray, dates: np.ndarray) -> dict:
    """Feature vector for the last row of a weekly series (numpy, no pandas)."""
    last = pd.Timestamp(dates[-1])
    weekofyear = last.isocalendar().week
    quarter = last.quarter

    n = len(units)
    lag1 = float(units[n - 2]) if n > 1 else 0.0
    lag2 = float(units[n - 3]) if n > 2 else 0.0
    lag4 = float(units[n - 5]) if n > 4 else 0.0

    def roll(k: int) -> float:
        if n >= k:
            return float(units[-k:].mean())
        return float(units.mean())

    def roll_std(k: int) -> float:
        return float(units[-k:].std()) if n >= k else 0.0

    last_nz = 0.0
    for v in units[::-1]:
        if v > 0:
            last_nz = float(v)
            break

    return {
        "weekofyear": int(weekofyear),
        "quarter": quarter,
        "lag1": lag1,
        "lag2": lag2,
        "lag4": lag4,
        "roll4": roll(4),
        "roll8": roll(8),
        "roll8_std": roll_std(8),
        "last_nz": last_nz,
    }


def _recursive_forecast(
    model, series: pd.Series, category, price, enc, price_mean, weeks: int
) -> list[float]:
    units = series.values.astype(float)
    dates = np.array(series.index)
    preds: list[float] = []
    cat_enc = int(enc.transform([category])[0])
    price_scale = price / price_mean
    for _ in range(weeks):
        row = _last_row_features(units, dates)
        row["category_enc"] = cat_enc
        row["price_scale"] = price_scale
        x = np.array([[row[f] for f in ALL_FEATURES]])
        p = max(0.0, float(model.predict(x)[0]))
        preds.append(p)
        units = np.append(units, p)
        dates = np.append(dates, dates[-1] + np.timedelta64(7, "D"))
    return preds


# ── Forecasting ───────────────────────────────────────────────────────
def _forecast_item(
    item: dict,
    model: GradientBoostingRegressor | None,
    enc: LabelEncoder,
    price_mean: float,
    backtest: dict | None,
    weeks: int,
) -> dict:
    df = _weekly_series(item["id"])
    series = pd.Series(df["units"].values, index=pd.to_datetime(df["date"]))

    current_stock = int(item["quantity"])
    daily = 0.0
    confidence = 0.0
    method = "insufficient_data"
    forecast_units: list[float] = []

    if len(series) >= 3:
        if model is not None and len(series) >= MIN_ML_WEEKS:
            method = "gradient_boosting"
            forecast_units = _recursive_forecast(
                model, series, item["category"], float(item["unitPrice"]), enc, price_mean, weeks
            )
            improvement = backtest["improvement_pct"] if backtest else 0.0
            score = max(0.0, min(1.0, improvement / 30.0))
            confidence = round(50.0 + score * 45.0, 1)
        else:
            method = "seasonal_baseline"
            recent = series.tail(8)
            weekly_mean = float(recent.mean()) if len(recent) else float(series.mean())
            forecast_units = [max(0.0, weekly_mean)] * weeks
            confidence = 55.0

        total_forecast = float(sum(forecast_units))
        daily = total_forecast / (weeks * 7) if forecast_units else 0.0

    if daily <= 0:
        daily = 0.1
        confidence = max(confidence, 35.0)
        total_forecast = daily * weeks * 7

    projected = total_forecast
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
_cache: dict[str, tuple[float, list[dict], dict | None]] = {}


def get_org_forecasts(org_id: str, limit: int = 200) -> list[dict]:
    """Forecast every item in an org, cached for a few minutes."""
    now = time.time()
    cached = _cache.get(org_id)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1][:limit]

    items = _load_items(org_id)
    panel = _build_panel(items)
    backtest = None
    model = None
    enc = LabelEncoder()
    enc.fit([])
    price_mean = 1.0

    if not panel.empty:
        enc, price_mean = _fit_encoders(panel)
        backtest = _walk_forward_backtest(panel, enc, price_mean, BACKTEST_HORIZON_WEEKS)
        if backtest and backtest["samples"] >= 20:
            data = _panel_with_features(panel, enc, price_mean)
            model = GradientBoostingRegressor(
                n_estimators=150, learning_rate=0.08, max_depth=3, random_state=42
            )
            model.fit(data[ALL_FEATURES].values, data["units"].values)

    forecasts = [
        _forecast_item(it, model, enc, price_mean, backtest, FORECAST_WEEKS) for it in items
    ]

    risk_order = {"critical": 0, "warning": 1, "safe": 2}
    forecasts.sort(key=lambda f: (risk_order[f["risk_level"]], f["days_remaining"]))

    _cache[org_id] = (now, forecasts, backtest)
    return forecasts[:limit]


def get_item_forecast(org_id: str, item_id: str) -> dict | None:
    """Forecast for a single item plus its weekly history for charting."""
    all_items = get_org_forecasts(org_id)
    forecast = next((f for f in all_items if f["id"] == item_id), None)
    if forecast is None:
        return None

    df = _weekly_series(item_id)
    history = [
        {"date": str(d.date()), "units": float(u)}
        for d, u in zip(df["date"], df["units"])
    ]
    forecast["history"] = history
    return forecast


def forecast_meta(org_id: str) -> dict:
    """Aggregate backtest quality (global model) for the org."""
    now = time.time()
    cached = _cache.get(org_id)
    backtest = cached[2] if cached and now - cached[0] < CACHE_TTL_SECONDS else None

    items = get_org_forecasts(org_id)
    ml = sum(1 for i in items if i["method"] == "gradient_boosting")

    if backtest is None:
        return {
            "model": "insufficient_data",
            "items_ml": ml,
            "items_total": len(items),
            "avg_improvement_pct": 0.0,
            "avg_wmape": None,
        }
    return {
        "model": "gradient_boosting",
        "items_ml": ml,
        "items_total": len(items),
        "avg_improvement_pct": backtest["improvement_pct"],
        "avg_wmape": backtest["wmape"],
        "horizon_days": FORECAST_WEEKS * 7,
    }
