"""
Inventory CRUD API routes.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from src.backend.database import get_db
from src.backend.models.schemas import InventoryCreate, InventoryUpdate

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("")
def list_inventory(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by item name"),
):
    """List all inventory items with optional filters."""
    with get_db() as conn:
        query = "SELECT * FROM inventory WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)
        if search:
            query += " AND item LIKE ?"
            params.append(f"%{search}%")

        query += " ORDER BY item ASC"
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


@router.get("/stats")
def get_stats():
    """Summary KPIs for the dashboard."""
    with get_db() as conn:
        row = conn.execute("""
            SELECT
                COUNT(*) AS total_items,
                COUNT(DISTINCT category) AS total_categories,
                SUM(quantity) AS total_quantity,
                ROUND(SUM(total_sales), 2) AS total_revenue,
                SUM(wastage) AS total_wastage,
                ROUND(AVG(price), 2) AS avg_price
            FROM inventory
        """).fetchone()
        return dict(row)


@router.get("/categories")
def get_categories():
    """List all unique categories."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT category FROM inventory ORDER BY category"
        ).fetchall()
        return [r["category"] for r in rows]


@router.get("/{item_id}")
def get_item(item_id: int):
    """Get a single inventory item by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM inventory WHERE id = ?", (item_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        return dict(row)


@router.post("", status_code=201)
def create_item(item: InventoryCreate):
    """Add a new inventory item."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO inventory
               (item, category, quantity, manufacturing_date, expiry_date,
                price, quantity_sold, total_sales, wastage, date_sold)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item.item, item.category, item.quantity,
                item.manufacturing_date, item.expiry_date,
                item.price, item.quantity_sold, item.total_sales,
                item.wastage, item.date_sold,
            ),
        )
        return {"id": cursor.lastrowid, "message": "Item created"}


@router.put("/{item_id}")
def update_item(item_id: int, item: InventoryUpdate):
    """Update an existing inventory item."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM inventory WHERE id = ?", (item_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")

        updates = {k: v for k, v in item.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [item_id]
        conn.execute(
            f"UPDATE inventory SET {set_clause} WHERE id = ?", values
        )
        return {"message": "Item updated"}


@router.delete("/{item_id}")
def delete_item(item_id: int):
    """Delete an inventory item."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM inventory WHERE id = ?", (item_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
        conn.execute("DELETE FROM inventory WHERE id = ?", (item_id,))
        return {"message": "Item deleted"}
