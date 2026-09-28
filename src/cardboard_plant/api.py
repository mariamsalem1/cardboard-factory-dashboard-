"""FastAPI backend: live mill JSON + 60s replay + static SPA."""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import ORJSONResponse, Response
from fastapi.staticfiles import StaticFiles

from . import db
from .reports import build_csv, build_pdf, preview
from .store import STORE

log = logging.getLogger("cardboard_plant")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

_REPLAY = int(os.environ.get("MILL_REPLAY_SECONDS", "60"))
_DIST = Path(__file__).resolve().parents[2] / "web" / "dist"


async def _replay_loop(stop: asyncio.Event) -> None:
    await asyncio.sleep(2)
    while not stop.is_set():
        try:
            await asyncio.to_thread(STORE.tick)
            log.info("Replay cycle=%s cursor=%s/%s", STORE.cycle_id, STORE.cursor, len(STORE.stamps))
        except Exception:
            log.exception("Replay tick failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=_REPLAY)
            break
        except asyncio.TimeoutError:
            pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    log.info("Loading mill datasets…")
    await asyncio.to_thread(STORE.load)
    ok, msg = db.ping()
    STORE.db_ok = ok or STORE.db_ok
    if not ok:
        STORE.db_message = msg
        log.warning("SQL ping failed: %s — serving from in-memory playback", msg)
    stop = asyncio.Event()
    task = asyncio.create_task(_replay_loop(stop))
    log.info("Replay loop started (%ss)", _REPLAY)
    try:
        yield
    finally:
        stop.set()
        try:
            await asyncio.wait_for(task, timeout=5)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            task.cancel()


app = FastAPI(title="Cardboard Plant SCADA", default_response_class=ORJSONResponse, lifespan=lifespan)


@app.get("/api/healthz")
def healthz() -> dict:
    ok, msg = db.ping()
    return {"ok": ok, "sql": msg, "cycle_id": STORE.cycle_id, "source": STORE.source}


@app.get("/api/state")
def state() -> dict:
    return STORE.state()


@app.get("/api/replay/status")
def replay_status() -> dict:
    st = STORE.state()
    st["interval_sec"] = _REPLAY
    return st


@app.get("/api/overview")
def overview() -> dict:
    return STORE.overview()


@app.get("/api/production")
def production() -> dict:
    return STORE.production()


@app.get("/api/process")
def process() -> dict:
    return STORE.process()


@app.get("/api/energy")
def energy() -> dict:
    return STORE.energy()


@app.get("/api/utilities")
def utilities() -> dict:
    return STORE.utilities()


@app.get("/api/oee")
def oee() -> dict:
    return STORE.oee()


@app.get("/api/sustainability")
def sustainability() -> dict:
    return STORE.sustainability()


@app.get("/api/alarms")
def alarms() -> dict:
    return STORE.alarms_payload()


@app.post("/api/alarms/{alarm_id}/acknowledge")
def ack_alarm(alarm_id: int) -> dict:
    if not STORE.acknowledge(alarm_id):
        raise HTTPException(404, "alarm not found")
    return {"ok": True, "alarm_id": alarm_id}


@app.get("/api/history")
def history(points: int = 36) -> dict:
    return STORE.history(points)


@app.post("/api/refresh")
def refresh() -> dict:
    STORE.tick()
    return STORE.state()


@app.get("/api/reports/preview")
def report_preview() -> dict:
    return preview()


@app.get("/api/reports/csv")
def report_csv() -> Response:
    body, name = build_csv()
    return Response(body, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.get("/api/reports/pdf")
def report_pdf() -> Response:
    body, name = build_pdf()
    return Response(body, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}"'})


if _DIST.exists():
    app.mount("/", StaticFiles(directory=_DIST, html=True), name="ui")
