"""Load Kaggle (or generated) mill CSVs into SQL Server."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from cardboard_plant.load import load_frames, persist_sql  # noqa: E402
from cardboard_plant.store import STORE  # noqa: E402


def main() -> int:
    tel, res, source = load_frames()
    print(f"Loaded {len(tel)} telemetry rows, {len(res)} resource rows (source={source})")
    persist_sql(tel, res)
    print("SQL Server mill tables refreshed.")
    STORE.telemetry = tel
    STORE.resources = res
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
