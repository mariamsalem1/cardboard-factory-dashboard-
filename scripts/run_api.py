"""Launch the cardboard plant FastAPI service on http://127.0.0.1:8787."""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv  # noqa: E402
import uvicorn  # noqa: E402

load_dotenv()

MILL_API_PORT = int(os.environ.get("MILL_API_PORT", "8787"))


def main() -> int:
    uvicorn.run(
        "cardboard_plant.api:app",
        host="127.0.0.1",
        port=MILL_API_PORT,
        log_level="info",
        access_log=True,
        reload=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
