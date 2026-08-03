"""
Demand forecasting and sales analytics service using Machine Learning.
"""
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from src.backend.database import get_db


def get_monthly_sales() -> list[dict]:
    """Aggregate total sales & volume by month from sales_history."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                substr(sale_date, 6, 2) AS month,
                SUM(total_sales) AS revenue,
                SUM(quantity_sold) AS units_sold,
                COUNT(*) AS items_count
            FROM sales_history
            GROUP BY month
            ORDER BY month
        """).fetchall()
        months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ]
        return [
            {
                "month": months[int(r["month"]) - 1] if r["month"] else "Unknown",
                "revenue": round(r["revenue"], 2),
                "units_sold": r["units_sold"],
                "items_count": r["items_count"],
            }
            for r in rows
            if r["month"]
        ]


def get_top_items(limit: int = 10) -> list[dict]:
    """Return the top-selling items by total_sales."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT item, category, quantity_sold, total_sales, price
            FROM inventory
            ORDER BY total_sales DESC
            LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]


def get_category_breakdown() -> list[dict]:
    """Breakdown by category: count, revenue, wastage."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                category,
                COUNT(*) AS item_count,
                SUM(quantity) AS total_stock,
                SUM(quantity_sold) AS total_sold,
                SUM(total_sales) AS total_revenue,
                SUM(wastage) AS total_wastage,
                ROUND(AVG(price), 2) AS avg_price
            FROM inventory
            GROUP BY category
            ORDER BY total_revenue DESC
        """).fetchall()
        return [dict(r) for r in rows]


def get_demand_forecast() -> list[dict]:
    """
    Demand forecast using statsmodels Exponential Smoothing.
    Forecasts based on monthly tracking from history.
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                id, item, category, quantity, wastage
            FROM inventory
            WHERE quantity > 0
        """).fetchall()

        if not rows:
            return []

        forecasts = []

        for r in rows:
            item_id = r["id"]
            qty = float(r["quantity"])
            wastage = float(r["wastage"])

            # Fetch monthly sequence
            history = conn.execute("""
                SELECT substr(sale_date, 1, 7) AS month_year, SUM(quantity_sold) as m_sold
                FROM sales_history
                WHERE item_id = ?
                GROUP BY month_year
                ORDER BY month_year
            """, (item_id,)).fetchall()

            # Process history data
            if len(history) < 3:
                # Fallback for insufficient data
                predicted_daily_demand = 0.5
                confidence = 50.0
            else:
                y = [float(row["m_sold"]) for row in history]
                try:
                    # Apply Exponential Smoothing to learn monthly trend
                    model = ExponentialSmoothing(y, trend="add", seasonal=None, initialization_method="estimated")
                    fit = model.fit()
                    forecast_next_month = fit.forecast(1)[0]
                    # Convert to daily demand
                    predicted_daily_demand = max(0.1, forecast_next_month / 30.0)
                    confidence = 85.0
                except Exception:
                    predicted_daily_demand = 0.5
                    confidence = 50.0

            # Factor in wastage (static constraint)
            daily_wastage = wastage / 365.0
            total_daily_depletion = max(0.01, predicted_daily_demand + daily_wastage)

            # Forecast: Days remaining based on the ES model
            days_remaining = qty / total_daily_depletion

            # Risk level classification
            if days_remaining < 30:
                risk = "critical"
            elif days_remaining < 90:
                risk = "warning"
            else:
                risk = "safe"

            forecasts.append({
                "id": r["id"],
                "item": r["item"],
                "category": r["category"],
                "current_stock": int(qty),
                "daily_demand": round(predicted_daily_demand, 2),
                "days_remaining": round(days_remaining, 1),
                "risk_level": risk,
                "recommended_restock": max(0, int((predicted_daily_demand * 90) - qty)),
                "confidence_score": round(confidence, 1)
            })

        # Sort by risk (critical first) then by fewest days remaining
        risk_order = {"critical": 0, "warning": 1, "safe": 2}
        forecasts.sort(key=lambda x: (risk_order[x["risk_level"]], x["days_remaining"]))
        
        return forecasts


def get_wastage_analysis() -> list[dict]:
    """Analyze wastage patterns by category."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                category,
                SUM(wastage) AS total_wastage,
                SUM(quantity) AS total_stock,
                ROUND(CAST(SUM(wastage) AS REAL) / SUM(quantity) * 100, 1) AS wastage_pct
            FROM inventory
            GROUP BY category
            ORDER BY wastage_pct DESC
        """).fetchall()
        return [dict(r) for r in rows]

