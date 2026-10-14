"""SQL Server connection for the cardboard plant dashboard."""

from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

try:
    import pyodbc
except ImportError:  # Vercel has no SQL Server ODBC driver
    pyodbc = None
from dotenv import load_dotenv

load_dotenv()

_REPO = Path(__file__).resolve().parents[2]
_SCHEMA_SQL = _REPO / "sql" / "001_schema.sql"


def _driver() -> str:
    if pyodbc is None:
        raise RuntimeError("pyodbc is not installed; SQL Server is unavailable on this host.")
    drivers = pyodbc.drivers()
    for name in ("ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server"):
        if name in drivers:
            return name
    raise RuntimeError("ODBC Driver 17/18 for SQL Server is not installed.")


def _auth_mode() -> str:
    mode = os.environ.get("MILL_DB_AUTH_MODE", "windows").lower()
    if mode not in ("sql", "windows"):
        raise RuntimeError(f"Invalid MILL_DB_AUTH_MODE={mode!r}")
    return mode


def _build_connection_string(database: str | None = None) -> str:
    mode = _auth_mode()
    server = os.environ.get("MILL_DB_SERVER", "localhost")
    dbname = database or os.environ.get("MILL_DB_NAME", "cardboard_plant")
    parts = [
        f"DRIVER={{{_driver()}}}",
        f"SERVER={server}",
        f"DATABASE={dbname}",
    ]
    if mode == "windows":
        parts.append("Trusted_Connection=yes")
    else:
        user = os.environ.get("MILL_DB_USER")
        pwd = os.environ.get("MILL_DB_PASSWORD")
        if not user or not pwd:
            raise RuntimeError("MILL_DB_USER / MILL_DB_PASSWORD required for sql auth")
        parts.append(f"UID={user}")
        parts.append(f"PWD={pwd}")
    parts.append(f"Encrypt={os.environ.get('MILL_DB_ENCRYPT', 'yes')}")
    parts.append(f"TrustServerCertificate={os.environ.get('MILL_DB_TRUST_CERT', 'yes')}")
    return ";".join(parts) + ";"


def get_connection(database: str | None = None) -> pyodbc.Connection:
    if pyodbc is None:
        raise RuntimeError("pyodbc is not installed; SQL Server is unavailable on this host.")
    return pyodbc.connect(_build_connection_string(database), timeout=8)


@contextmanager
def connection(database: str | None = None) -> Iterator[pyodbc.Connection]:
    conn = get_connection(database)
    try:
        yield conn
    finally:
        conn.close()


def ping() -> tuple[bool, str]:
    try:
        with connection() as conn:
            row = conn.cursor().execute("SELECT 1").fetchone()
            if row and row[0] == 1:
                return True, "SQL Server reachable"
            return False, f"Unexpected response: {row}"
    except Exception as exc:
        return False, str(exc)


def ensure_database() -> None:
    """Create cardboard_plant if missing, then apply DDL batches."""
    dbname = os.environ.get("MILL_DB_NAME", "cardboard_plant")
    safe = dbname.replace("]", "]]").replace("'", "''")
    with connection("master") as conn:
        conn.autocommit = True
        conn.cursor().execute(
            f"IF DB_ID(N'{safe}') IS NULL CREATE DATABASE [{safe}]"
        )
    apply_schema()


def apply_schema() -> None:
    sql = _SCHEMA_SQL.read_text(encoding="utf-8")
    batches = [b.strip() for b in sql.split("GO") if b.strip()]
    dbname = os.environ.get("MILL_DB_NAME", "cardboard_plant")
    with connection(dbname) as conn:
        conn.autocommit = True
        cur = conn.cursor()
        for batch in batches:
            if batch.upper().startswith("USE "):
                continue
            if "CREATE DATABASE" in batch.upper():
                continue
            cur.execute(batch)
