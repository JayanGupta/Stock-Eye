"""
Postgres read helpers for the ML service.

The ML service is a read-only consumer of the Postgres schema that the
web app owns (managed by Prisma). All writes happen through the Next.js
server actions and the Prisma client.
"""
import psycopg2
from psycopg2.extras import RealDictCursor

from src.backend.config import DATABASE_URL


def query(sql: str, params: list | tuple | None = None) -> list[dict]:
    """Execute a read-only SQL query and return rows as dicts."""
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
