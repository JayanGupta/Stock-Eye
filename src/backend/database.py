"""
SQLite database setup and helpers for Stock-Eye.
"""
import sqlite3
from contextlib import contextmanager
from src.backend.config import DB_PATH


def get_connection() -> sqlite3.Connection:
    """Return a new connection with row-factory enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS inventory (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                item            TEXT NOT NULL,
                category        TEXT NOT NULL,
                quantity         INTEGER NOT NULL DEFAULT 0,
                manufacturing_date TEXT,
                expiry_date     TEXT,
                price           REAL NOT NULL DEFAULT 0,
                quantity_sold   INTEGER NOT NULL DEFAULT 0,
                total_sales     REAL NOT NULL DEFAULT 0,
                wastage         INTEGER NOT NULL DEFAULT 0,
                date_sold       TEXT
            );

            CREATE TABLE IF NOT EXISTS detections (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                image_name      TEXT,
                timestamp       TEXT DEFAULT (datetime('now')),
                class_label     TEXT NOT NULL,
                confidence      REAL,
                bbox_x          INTEGER,
                bbox_y          INTEGER,
                bbox_w          INTEGER,
                bbox_h          INTEGER
            );

            CREATE TABLE IF NOT EXISTS sales_history (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id         INTEGER NOT NULL,
                quantity_sold   INTEGER NOT NULL,
                sale_date       TEXT NOT NULL,
                total_sales     REAL NOT NULL,
                FOREIGN KEY(item_id) REFERENCES inventory(id)
            );
        """)
