"""
Seed the SQLite database from the existing inventory CSV file.
"""
import csv
from src.backend.config import INVENTORY_CSV
from src.backend.database import get_db


def seed_inventory():
    """Load inventory CSV into the database if the table is empty."""
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
        if count > 0:
            return  # already seeded

        if not INVENTORY_CSV.exists():
            print(f"[seed] Inventory file not found at {INVENTORY_CSV}")
            return

        with open(INVENTORY_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = []
            for row in reader:
                rows.append((
                    row.get("Item", ""),
                    row.get("Category", ""),
                    int(row.get("Quantity", 0)),
                    row.get("Manufacturing_Date", ""),
                    row.get("Expiry_Date", ""),
                    float(row.get("Price", 0)),
                    int(row.get("Quantity_Sold", 0)),
                    float(row.get("Total_Sales", 0)),
                    int(row.get("Wasteage", 0)),
                    row.get("Date_Sold", ""),
                ))

            conn.executemany(
                """INSERT INTO inventory
                   (item, category, quantity, manufacturing_date, expiry_date,
                    price, quantity_sold, total_sales, wastage, date_sold)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                rows,
            )
            print(f"[seed] Inserted {len(rows)} inventory items.")
