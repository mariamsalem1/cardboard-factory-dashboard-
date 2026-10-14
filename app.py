"""Vercel entrypoint for the FastAPI service.

Local development still uses scripts/run_api.py. This module only exists so
Vercel can load `app:app` and import the package from src/.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from cardboard_plant.api import app

__all__ = ["app"]
