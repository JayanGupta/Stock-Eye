"""
Inventory CRUD API routes.
"""
from fastapi import APIRouter, HTTPException, Query
from src.backend.database import get_db
from src.backend.models.schemas import InventoryCreate, InventoryUpdate

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("")
def list_inventory(
    category: str | None = Query(None, description="Filter by category"),
    search: str | None = Query(None, description="Search by item name"),
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

@router.post("/{item_id}/sell")
def sell_item(item_id: int):
    """Simulate selling one unit of an item."""
    with get_db() as conn:
        row = conn.execute("SELECT quantity, quantity_sold, price, total_sales FROM inventory WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        if row["quantity"] <= 0:
            raise HTTPException(status_code=400, detail="Item out of stock")
            
        conn.execute("""
            UPDATE inventory 
            SET quantity = quantity - 1, 
                quantity_sold = quantity_sold + 1,
                total_sales = total_sales + price
            WHERE id = ?
        """, (item_id,))
        conn.execute("INSERT INTO sales_history (item_id, quantity_sold, sale_date, total_sales) VALUES (?, 1, datetime('now'), ?)", (item_id, row["price"]))
        return {"message": "1 item sold"}

@router.post("/{item_id}/waste")
def waste_item(item_id: int):
    """Simulate wasting one unit of an item."""
    with get_db() as conn:
        row = conn.execute("SELECT quantity, wastage FROM inventory WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        if row["quantity"] <= 0:
            raise HTTPException(status_code=400, detail="Item out of stock")
            
        conn.execute("""
            UPDATE inventory 
            SET quantity = quantity - 1, 
                wastage = wastage + 1
            WHERE id = ?
        """, (item_id,))
        return {"message": "1 item wasted"}

@router.post("/simulate/bulk")
def simulate_bulk_activity():
    """Simulate a randomized day of sales and wastage across all items."""
    import random
    with get_db() as conn:
        rows = conn.execute("SELECT id, quantity, price FROM inventory WHERE quantity > 0").fetchall()
        
        sold_total = 0
        wasted_total = 0
        
        for r in rows:
            # Simulate 0-5 items sold
            to_sell = min(r["quantity"], random.randint(0, 5))
            if to_sell > 0:
                conn.execute("""
                    UPDATE inventory 
                    SET quantity = quantity - ?,
                        quantity_sold = quantity_sold + ?,
                        total_sales = total_sales + (? * price)
                    WHERE id = ?
                """, (to_sell, to_sell, to_sell, r["id"]))
                conn.execute("INSERT INTO sales_history (item_id, quantity_sold, sale_date, total_sales) VALUES (?, ?, datetime('now'), ? * ?)", (r["id"], to_sell, to_sell, r["price"]))
                sold_total += to_sell
                
            # Simulate 0-1 items wasted (less common)
            remaining = r["quantity"] - to_sell
            to_waste = min(remaining, random.randint(0, 1) if random.random() > 0.7 else 0)
            if to_waste > 0:
                conn.execute("""
                    UPDATE inventory 
                    SET quantity = quantity - ?,
                        wastage = wastage + ?
                    WHERE id = ?
                """, (to_waste, to_waste, r["id"]))
                wasted_total += to_waste
                
        return {"message": f"Simulated activity: {sold_total} sold, {wasted_total} wasted"}
