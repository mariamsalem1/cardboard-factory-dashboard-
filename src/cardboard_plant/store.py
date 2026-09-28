"""In-memory mill playback with SQL persistence. Advances one timestamp every tick."""

from __future__ import annotations

import threading
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any

import pandas as pd

from . import db
from .domain import (
    ENERGY_SHARES,
    LINE_IDS,
    LINE_LABEL,
    STAGE_IDS,
    STAGE_LABEL,
    STATUS_COLORS,
    STATUS_LABELS,
)
from .load import load_frames, persist_sql

GRID_KG_CO2_PER_KWH = 0.45


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MillStore:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.telemetry = pd.DataFrame()
        self.resources = pd.DataFrame()
        self.stamps: list[pd.Timestamp] = []
        self.cursor = 0
        self.cycle_id = 0
        self.source = "generated"
        self.db_ok = False
        self.db_message = "not connected"
        self.alarms: list[dict[str, Any]] = []
        self._alarm_seq = 1
        self.kpi_history: deque[dict[str, Any]] = deque(maxlen=48)
        self.loaded = False
        self._snapshot: dict[str, Any] = {}

    def load(self) -> None:
        tel, res, source = load_frames()
        tel["ts"] = pd.to_datetime(tel["ts"])
        res["ts"] = pd.to_datetime(res["ts"])
        try:
            persist_sql(tel, res)
            ok, msg = True, "SQL Server loaded"
        except Exception as exc:
            ok, msg = False, str(exc)
        stamps = sorted(tel["ts"].dropna().unique().tolist())
        start = 0
        for i, ts in enumerate(stamps):
            if pd.Timestamp(ts).hour >= 9:
                start = i
                break
        with self.lock:
            self.telemetry = tel
            self.resources = res
            self.stamps = stamps
            self.cursor = start
            self.cycle_id = 1
            self.source = source
            self.db_ok = ok
            self.db_message = msg
            self.loaded = True
            self.alarms = []
            self._alarm_seq = 1
            self.kpi_history.clear()
        self._recompute(persist=True)

    def tick(self) -> None:
        with self.lock:
            if not self.stamps:
                return
            self.cursor = (self.cursor + 1) % len(self.stamps)
            self.cycle_id += 1
        self._recompute(persist=True)

    def _slice(self) -> tuple[pd.DataFrame, pd.DataFrame, pd.Timestamp]:
        ts = self.stamps[self.cursor]
        tel = self.telemetry[self.telemetry["ts"] == ts]
        res = self.resources[self.resources["ts"] == ts]
        if tel.empty:
            tel = self.telemetry[self.telemetry["ts"] <= ts].groupby("stage_id", as_index=False).tail(1)
        if res.empty:
            res = self.resources[self.resources["ts"] <= ts].groupby("stage_id", as_index=False).tail(1)
        return tel, res, ts

    def _history_window(self, points: int = 24) -> pd.DataFrame:
        if not self.stamps:
            return pd.DataFrame()
        start = max(0, self.cursor - points + 1)
        window = self.stamps[start : self.cursor + 1]
        return self.telemetry[self.telemetry["ts"].isin(window)]

    def _recompute(self, persist: bool = False) -> None:
        with self.lock:
            tel, res, ts = self._slice()
            stages = []
            for stage_id in STAGE_IDS:
                trow = tel[tel["stage_id"] == stage_id]
                rrow = res[res["stage_id"] == stage_id]
                t = trow.iloc[0] if not trow.empty else None
                r = rrow.iloc[0] if not rrow.empty else None
                status = str(t["status"]) if t is not None else "ready"
                stages.append(
                    {
                        "id": stage_id,
                        "label": STAGE_LABEL[stage_id],
                        "line_id": str(t["line_id"]) if t is not None else LINE_IDS[0],
                        "status": status,
                        "status_label": STATUS_LABELS[status],
                        "color": STATUS_COLORS[status],
                        "speed_mpm": float(t["speed_mpm"]) if t is not None else 0.0,
                        "throughput_tph": float(t["throughput_tph"]) if t is not None else 0.0,
                        "utilization_pct": float(t["utilization_pct"]) if t is not None else 0.0,
                        "quality_pct": float(t["quality_pct"]) if t is not None else 0.0,
                        "energy_kwh": float(r["energy_kwh"]) if r is not None else 0.0,
                        "water_m3": float(r["water_m3"]) if r is not None else 0.0,
                        "steam_bar": float(r["steam_bar"]) if r is not None else 0.0,
                        "boiler_pct": float(r["boiler_pct"]) if r is not None else 0.0,
                        "air_bar": float(r["compressed_air_bar"]) if r is not None else 0.0,
                        "material_kg": float(r["material_kg"]) if r is not None else 0.0,
                        "material_type": str(r["material_type"]) if r is not None else "other",
                        "defect_rate": float(r["defect_rate"]) if r is not None else 0.0,
                        "output_kg": float(r["output_kg"]) if r is not None else 0.0,
                        "alarm_code": (None if t is None or pd.isna(t["alarm_code"]) else str(t["alarm_code"])),
                    }
                )
            for st in stages:
                if st["status"] == "broken" and st["alarm_code"]:
                    already = any(
                        a["code"] == st["alarm_code"] and a["stage_id"] == st["id"] and not a["acknowledged"]
                        for a in self.alarms[-12:]
                    )
                    if not already:
                        self.alarms.append(
                            {
                                "alarm_id": self._alarm_seq,
                                "ts": ts.isoformat(),
                                "stage_id": st["id"],
                                "line_id": st["line_id"],
                                "severity": "critical" if st["utilization_pct"] < 15 else "warning",
                                "code": st["alarm_code"],
                                "message": f"{st['alarm_code']} · {st['label']}",
                                "acknowledged": False,
                            }
                        )
                        self._alarm_seq += 1

            tph = sum(s["throughput_tph"] for s in stages) / max(len(stages), 1)
            production_24h = tph * 24.0
            speed = next((s["speed_mpm"] for s in stages if s["id"] == "corrugator"), stages[3]["speed_mpm"])
            paper = sum(s["material_kg"] for s in stages if s["material_type"] in ("recycled", "virgin")) / 1000.0 * 4
            energy_mwh = sum(s["energy_kwh"] for s in stages) / 1000.0 * (24 * 60 / 15)
            broken_n = sum(1 for s in stages if s["status"] == "broken")
            avail = 100.0 * (len(stages) - broken_n) / max(len(stages), 1)
            util_mean = sum(s["utilization_pct"] for s in stages) / max(len(stages), 1)
            perf = min(115.0, 100.0 * (speed / 320.0) * (util_mean / 90.0))
            qual = sum(s["quality_pct"] for s in stages) / max(len(stages), 1)
            oee = avail * (perf / 100.0) * (qual / 100.0)

            prev = self.kpi_history[-1] if self.kpi_history else None
            kpis = {
                "production_tons": round(production_24h, 1),
                "line_speed_mpm": round(speed, 1),
                "paper_usage_tons": round(max(paper, production_24h * 0.74), 1),
                "energy_mwh": round(energy_mwh, 0),
                "oee_pct": round(oee, 1),
                "quality_pct": round(qual, 1),
                "d_production": _delta(production_24h, prev["production_tons"] if prev else production_24h * 0.94),
                "d_speed": _delta(speed, prev["line_speed_mpm"] if prev else speed * 0.96),
                "d_paper": _delta(paper, prev["paper_usage_tons"] if prev else paper * 1.02, invert=True),
                "d_energy": _delta(energy_mwh, prev["energy_mwh"] if prev else energy_mwh * 1.05, invert=True),
                "d_oee": _delta(oee, prev["oee_pct"] if prev else oee * 0.97),
                "d_quality": _delta(qual, prev["quality_pct"] if prev else qual * 0.995),
            }
            spark = {
                "production": [h["production_tons"] for h in self.kpi_history] + [kpis["production_tons"]],
                "speed": [h["line_speed_mpm"] for h in self.kpi_history] + [kpis["line_speed_mpm"]],
                "paper": [h["paper_usage_tons"] for h in self.kpi_history] + [kpis["paper_usage_tons"]],
                "energy": [h["energy_mwh"] for h in self.kpi_history] + [kpis["energy_mwh"]],
                "oee": [h["oee_pct"] for h in self.kpi_history] + [kpis["oee_pct"]],
                "quality": [h["quality_pct"] for h in self.kpi_history] + [kpis["quality_pct"]],
            }
            self.kpi_history.append({**kpis, "ts": ts.isoformat(), "cycle_id": self.cycle_id})
            self._snapshot = {
                "ts": ts.isoformat(),
                "cycle_id": self.cycle_id,
                "source": self.source,
                "db_ok": self.db_ok,
                "db_message": self.db_message,
                "plant_status": "fault" if any(s["status"] == "broken" for s in stages) else "running",
                "stages": stages,
                "kpis": kpis,
                "sparklines": spark,
            }
            if persist and self.db_ok:
                try:
                    self._persist_current(stages, ts)
                except Exception as exc:
                    self.db_ok = False
                    self.db_message = str(exc)

    def _persist_current(self, stages: list[dict[str, Any]], ts: pd.Timestamp) -> None:
        as_of = ts.to_pydatetime()
        with db.connection() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM mill_current_state")
            cur.executemany(
                """INSERT INTO mill_current_state
                   (stage_id, line_id, status, speed_mpm, throughput_tph, utilization_pct,
                    quality_pct, energy_kwh, water_m3, steam_bar, boiler_pct, compressed_air_bar,
                    material_kg, material_type, defect_rate, output_kg, alarm_code, ts, cycle_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    (
                        st["id"], st["line_id"], st["status"], st["speed_mpm"], st["throughput_tph"],
                        st["utilization_pct"], st["quality_pct"], st["energy_kwh"], st["water_m3"],
                        st["steam_bar"], st["boiler_pct"], st["air_bar"], st["material_kg"],
                        st["material_type"], st["defect_rate"], st["output_kg"], st["alarm_code"],
                        as_of, self.cycle_id,
                    )
                    for st in stages
                ],
            )
            cur.execute("DELETE FROM replay_state")
            cur.execute(
                "INSERT INTO replay_state (id, cycle_id, cursor_index, as_of, updated_at) VALUES (1, ?, ?, ?, SYSUTCDATETIME())",
                self.cycle_id, self.cursor, as_of,
            )
            conn.commit()

    def overview(self) -> dict[str, Any]:
        with self.lock:
            snap = dict(self._snapshot)
            stages = snap["stages"]
            hist = self._history_window(28)
            trend = []
            if not hist.empty:
                grouped = hist.groupby("ts")["throughput_tph"].mean()
                for ts, val in grouped.items():
                    trend.append(
                        {
                            "t": pd.Timestamp(ts).strftime("%b %d %H:%M"),
                            "actual": round(float(val) * 24, 1),
                            "target": 480.0,
                        }
                    )
            energy_total = sum(s["energy_kwh"] for s in stages) or 1.0
            energy_break = []
            labels = {
                "paper_machine": "Paper Machine",
                "press_drying": "Dryer Section",
                "glue_unit": "Air Compressors",
                "slitter": "Utilities",
                "pulper": "Lighting & Others",
                "corrugator": "HVAC",
            }
            for sid, label in labels.items():
                kwh = next((s["energy_kwh"] for s in stages if s["id"] == sid), energy_total * ENERGY_SHARES.get(sid, 0.05))
                energy_break.append({"name": label, "value": round(100.0 * kwh / energy_total, 1)})

            mats = defaultdict(float)
            for s in stages:
                mats[s["material_type"]] += s["material_kg"]
            total_m = sum(mats.values()) or 1.0
            material = [
                {"name": "Recycled Paper", "tons": round(mats.get("recycled", 0) / 1000, 1), "pct": round(100 * mats.get("recycled", 0) / total_m)},
                {"name": "Virgin Pulp", "tons": round(mats.get("virgin", 0) / 1000, 1), "pct": round(100 * mats.get("virgin", 0) / total_m)},
                {"name": "Adhesive", "tons": round(mats.get("adhesive", 0) / 1000, 1), "pct": round(100 * mats.get("adhesive", 0) / total_m)},
                {"name": "Others", "tons": round(mats.get("other", 0) / 1000, 1), "pct": round(100 * mats.get("other", 0) / total_m)},
            ]

            line_map: dict[str, list[dict[str, Any]]] = defaultdict(list)
            for s in stages:
                line_map[s["line_id"]].append(s)
            lines = []
            for lid in LINE_IDS:
                grp = line_map.get(lid, [])
                util = sum(x["utilization_pct"] for x in grp) / max(len(grp), 1)
                if any(x["status"] == "broken" for x in grp):
                    st = "broken"
                elif any(x["status"] == "in_use" for x in grp):
                    st = "in_use"
                else:
                    st = "ready"
                lines.append(
                    {
                        "id": lid,
                        "label": LINE_LABEL[lid],
                        "status": st,
                        "status_label": STATUS_LABELS[st],
                        "utilization_pct": round(util, 0),
                        "color": STATUS_COLORS[st],
                    }
                )

            steam = sum(s["steam_bar"] for s in stages) / max(len(stages), 1)
            boiler = sum(s["boiler_pct"] for s in stages) / max(len(stages), 1)
            water = sum(s["water_m3"] for s in stages) / max(len(stages), 1) * 4
            air = sum(s["air_bar"] for s in stages) / max(len(stages), 1)

            return {
                **snap,
                "lines": lines,
                "utilities": {
                    "steam_bar": round(steam, 1),
                    "boiler_pct": round(boiler, 1),
                    "water_m3h": round(water, 0),
                    "air_bar": round(air, 1),
                    "d_steam": 2.0,
                    "d_boiler": 1.0,
                    "d_water": 4.0,
                    "d_air": 0.0,
                    "spark_steam": [h.get("steam", steam) for h in list(self.kpi_history)[-12:]] or [steam],
                    "spark_boiler": [boiler],
                    "spark_water": [water],
                    "spark_air": [air],
                },
                "trend": trend[-14:],
                "energy_breakdown": energy_break,
                "material": material,
                "alarms": list(reversed(self.alarms[-8:])),
                "alarm_open": sum(1 for a in self.alarms if not a["acknowledged"]),
                "clock": _now_iso(),
            }

    def production(self) -> dict[str, Any]:
        ov = self.overview()
        hist = self._history_window(36)
        series = []
        if not hist.empty:
            g = hist.groupby(["ts", "line_id"])["throughput_tph"].mean().reset_index()
            for ts, chunk in g.groupby("ts"):
                row = {"t": pd.Timestamp(ts).strftime("%H:%M")}
                for lid in LINE_IDS:
                    sub = chunk[chunk["line_id"] == lid]
                    row[lid] = round(float(sub["throughput_tph"].mean() * 24) if not sub.empty else 0, 1)
                series.append(row)
        donuts = []
        for ln in ov["lines"]:
            donuts.append(
                {
                    "id": ln["id"],
                    "label": ln["label"],
                    "oee": ln["utilization_pct"],
                    "status": ln["status"],
                    "color": ln["color"],
                }
            )
        return {"cycle_id": ov["cycle_id"], "ts": ov["ts"], "lines": ov["lines"], "series": series, "donuts": donuts, "kpis": ov["kpis"]}

    def process(self) -> dict[str, Any]:
        ov = self.overview()
        hist = self._history_window(20)
        panels = []
        for st in ov["stages"]:
            spark = []
            if not hist.empty:
                sub = hist[hist["stage_id"] == st["id"]].sort_values("ts")
                spark = [round(float(x), 1) for x in sub["utilization_pct"].tolist()]
            panels.append({**st, "spark": spark})
        return {"cycle_id": ov["cycle_id"], "ts": ov["ts"], "panels": panels}

    def energy(self) -> dict[str, Any]:
        ov = self.overview()
        hist = self._history_window(24)
        area = []
        if not hist.empty:
            joined = hist.merge(self.resources, on=["ts", "stage_id"], how="left")
            for ts, chunk in joined.groupby("ts"):
                row = {"t": pd.Timestamp(ts).strftime("%H:%M")}
                for sid in ("paper_machine", "press_drying", "glue_unit", "slitter", "pulper"):
                    sub = chunk[chunk["stage_id"] == sid]
                    row[sid] = round(float(sub["energy_kwh"].sum()) if not sub.empty else 0, 1)
                area.append(row)
        return {
            "cycle_id": ov["cycle_id"],
            "ts": ov["ts"],
            "total_mwh": ov["kpis"]["energy_mwh"],
            "breakdown": ov["energy_breakdown"],
            "area": area,
            "kwh_per_ton": round(ov["kpis"]["energy_mwh"] * 1000 / max(ov["kpis"]["production_tons"], 1), 1),
        }

    def utilities(self) -> dict[str, Any]:
        ov = self.overview()
        hist = self._history_window(24)
        res_h = self.resources[self.resources["ts"].isin(self.stamps[max(0, self.cursor - 23) : self.cursor + 1])]
        series = []
        if not res_h.empty:
            g = res_h.groupby("ts").agg(
                steam=("steam_bar", "mean"),
                boiler=("boiler_pct", "mean"),
                water=("water_m3", "sum"),
                air=("compressed_air_bar", "mean"),
            )
            for ts, row in g.iterrows():
                series.append(
                    {
                        "t": pd.Timestamp(ts).strftime("%H:%M"),
                        "steam": round(float(row["steam"]), 2),
                        "boiler": round(float(row["boiler"]), 1),
                        "water": round(float(row["water"]) * 4, 1),
                        "air": round(float(row["air"]), 2),
                    }
                )
        return {"cycle_id": ov["cycle_id"], "ts": ov["ts"], "utilities": ov["utilities"], "series": series, "hist_len": len(hist)}

    def oee(self) -> dict[str, Any]:
        ov = self.overview()
        hist = self._history_window(40)
        reasons = {"downtime": 0, "speed_loss": 0, "quality": 0, "idle": 0}
        if not hist.empty:
            reasons["downtime"] = int((hist["status"] == "broken").sum())
            reasons["idle"] = int((hist["status"] == "ready").sum())
            reasons["speed_loss"] = int(((hist["status"] == "in_use") & (hist["speed_mpm"] < 280)).sum())
            reasons["quality"] = int((hist["quality_pct"] < 96).sum())
        fleet = ov["kpis"]["oee_pct"]
        avail = 100.0 * sum(1 for s in ov["stages"] if s["status"] != "broken") / 8
        perf = min(100.0, ov["kpis"]["line_speed_mpm"] / 3.2)
        qual = ov["kpis"]["quality_pct"]
        by_line = []
        for ln in ov["lines"]:
            by_line.append(
                {
                    "id": ln["id"],
                    "label": ln["label"],
                    "availability": round(avail if ln["status"] != "broken" else avail * 0.7, 1),
                    "performance": round(ln["utilization_pct"], 1),
                    "quality": round(qual if ln["status"] != "broken" else 88.0, 1),
                    "oee": round(ln["utilization_pct"] * 0.92, 1),
                    "status": ln["status"],
                }
            )
        return {
            "cycle_id": ov["cycle_id"],
            "fleet": {"oee": fleet, "availability": round(avail, 1), "performance": round(perf, 1), "quality": round(qual, 1)},
            "lines": by_line,
            "reasons": [
                {"name": "Downtime", "value": reasons["downtime"], "color": "#e53935"},
                {"name": "Speed loss", "value": reasons["speed_loss"], "color": "#ffb020"},
                {"name": "Quality", "value": reasons["quality"], "color": "#4fc3f7"},
                {"name": "Idle / ready", "value": reasons["idle"], "color": "#64748b"},
            ],
        }

    def sustainability(self) -> dict[str, Any]:
        ov = self.overview()
        stages = ov["stages"]
        rec = sum(s["material_kg"] for s in stages if s["material_type"] == "recycled")
        vir = sum(s["material_kg"] for s in stages if s["material_type"] == "virgin")
        total = rec + vir or 1.0
        recycled_pct = 100.0 * rec / total
        energy_mwh = ov["kpis"]["energy_mwh"]
        water = ov["utilities"]["water_m3h"]
        co2 = energy_mwh * 1000 * GRID_KG_CO2_PER_KWH / 1000.0
        waste = sum(s["output_kg"] * s["defect_rate"] for s in stages) / 1000.0
        kwh_t = energy_mwh * 1000 / max(ov["kpis"]["production_tons"], 1)
        return {
            "cycle_id": ov["cycle_id"],
            "ts": ov["ts"],
            "gauges": {
                "recycled_pct": round(recycled_pct, 1),
                "kwh_per_ton": round(kwh_t, 0),
                "water_m3h": round(water, 0),
                "co2_t": round(co2, 1),
                "waste_t": round(waste, 2),
            },
            "targets": {"recycled_pct": 70, "kwh_per_ton": 2400, "water_m3h": 110, "co2_t": 520, "waste_t": 1.2},
            "mix": [
                {"name": "Recycled", "value": round(recycled_pct, 1), "color": "#3dcd58"},
                {"name": "Virgin", "value": round(100 - recycled_pct, 1), "color": "#4fc3f7"},
            ],
            "energy_mix": ov["energy_breakdown"],
            "material": ov["material"],
            "alert": "Within mill sustainability bands" if recycled_pct >= 55 else "Recycled share below target",
        }

    def alarms_payload(self, include_ack: bool = True) -> dict[str, Any]:
        with self.lock:
            rows = list(reversed(self.alarms))
            if not include_ack:
                rows = [a for a in rows if not a["acknowledged"]]
            return {
                "cycle_id": self.cycle_id,
                "open": sum(1 for a in self.alarms if not a["acknowledged"]),
                "rows": rows[:80],
            }

    def acknowledge(self, alarm_id: int) -> bool:
        with self.lock:
            for a in self.alarms:
                if a["alarm_id"] == alarm_id:
                    a["acknowledged"] = True
                    if self.db_ok:
                        try:
                            with db.connection() as conn:
                                conn.cursor().execute(
                                    "UPDATE mill_alarm SET acknowledged=1 WHERE alarm_id=?",
                                    alarm_id,
                                )
                                conn.commit()
                        except Exception:
                            pass
                    return True
        return False

    def history(self, points: int = 36) -> dict[str, Any]:
        hist = self._history_window(points)
        samples = []
        if not hist.empty:
            for _, row in hist.sort_values("ts").iterrows():
                samples.append(
                    {
                        "ts": pd.Timestamp(row["ts"]).isoformat(),
                        "stage_id": row["stage_id"],
                        "status": row["status"],
                        "speed_mpm": float(row["speed_mpm"]),
                        "utilization_pct": float(row["utilization_pct"]),
                        "quality_pct": float(row["quality_pct"]),
                    }
                )
        return {"cycle_id": self.cycle_id, "samples": samples}

    def state(self) -> dict[str, Any]:
        with self.lock:
            return {
                "cycle_id": self.cycle_id,
                "cursor": self.cursor,
                "stamps": len(self.stamps),
                "db_ok": self.db_ok,
                "db_message": self.db_message,
                "source": self.source,
                "plant_status": self._snapshot.get("plant_status"),
                "as_of": self._snapshot.get("ts"),
                "replay_seconds": 60,
            }


def _delta(cur: float, prev: float, invert: bool = False) -> float:
    if not prev:
        return 0.0
    pct = 100.0 * (cur - prev) / abs(prev)
    return round(-pct if invert else pct, 1)


STORE = MillStore()
