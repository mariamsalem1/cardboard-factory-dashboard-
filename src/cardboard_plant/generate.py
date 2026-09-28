"""Generate cardboard-mill telemetry compatible with PIADE + resource-efficiency schemas."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from .domain import (
    ENERGY_SHARES,
    LINE_IDS,
    STAGE_IDS,
    status_from_util,
)

_REPO = Path(__file__).resolve().parents[2]
DATA_DIR = _REPO / "data"

ALARM_CODES = [
    "Low paper level",
    "High temperature - Dryer",
    "Maintenance due - Vacuum Pump",
    "Power quality event",
    "Conveyor overload",
    "Glue viscosity high",
    "Steam pressure low",
    "Web break",
]


def generate_mill_frames(
    hours: int = 120,
    step_minutes: int = 15,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    n = int((hours * 60) / step_minutes)
    start = datetime(2026, 9, 9, 0, 0, 0)
    stamps = [start + timedelta(minutes=step_minutes * i) for i in range(n)]

    tel_rows: list[dict] = []
    res_rows: list[dict] = []

    for i, ts in enumerate(stamps):
        hour = ts.hour + ts.minute / 60.0
        day_shift = 6.0 <= hour < 22.0
        diurnal = (0.94 + 0.06 * np.sin((hour - 8) / 16.0 * np.pi)) if day_shift else 0.52
        wave = 0.03 * np.sin(i / 9.0)

        for s_idx, stage in enumerate(STAGE_IDS):
            line = LINE_IDS[s_idx % len(LINE_IDS)]
            fault = rng.random() < (0.028 if stage in ("corrugator", "press_drying") else 0.012)
            standby = (not fault) and rng.random() < (0.04 if day_shift else 0.18)
            util = float(np.clip(100 * diurnal * (0.92 + wave + 0.04 * rng.normal()) - (22 if standby else 0), 8, 99))
            if fault:
                util = float(rng.uniform(6, 22))
            quality = float(np.clip(98.7 + rng.normal(0, 0.45) - (8 if fault else 0), 82, 99.8))
            speed = float(np.clip(320 * (util / 92.0) + rng.normal(0, 6), 40, 380))
            tph = float(np.clip(20.1 * (util / 92.0) + rng.normal(0, 0.4), 2, 28))
            status = "broken" if fault else ("ready" if standby else status_from_util(util, quality))
            alarm = None
            if status == "broken":
                alarm = ALARM_CODES[(s_idx + i) % len(ALARM_CODES)]

            tel_rows.append(
                {
                    "ts": ts,
                    "stage_id": stage,
                    "line_id": line,
                    "status": status,
                    "speed_mpm": round(speed, 2),
                    "throughput_tph": round(tph, 3),
                    "utilization_pct": round(util, 1),
                    "quality_pct": round(quality, 2),
                    "alarm_code": alarm,
                    "source": "generated",
                }
            )

            share = ENERGY_SHARES.get(stage, 0.05)
            energy = float(np.clip(1245 / (24 * (60 / step_minutes)) * 1000 * share * (util / 90) * (0.9 + 0.2 * rng.random()), 4, 9000))
            water = float(np.clip(120 / (60 / step_minutes) * (util / 90) * (0.85 + 0.25 * rng.random()), 0.2, 40))
            steam = float(np.clip(8.5 + rng.normal(0, 0.18) - (1.4 if fault else 0), 5.8, 9.4))
            boiler = float(np.clip(87.2 + rng.normal(0, 0.8) - (12 if fault else 0), 62, 94))
            air = float(np.clip(6.2 + rng.normal(0, 0.08), 5.4, 6.8))
            output_kg = tph * 1000 * (step_minutes / 60.0)
            defect = float(np.clip((100 - quality) / 100.0 * (0.7 + 0.6 * rng.random()), 0.002, 0.12))
            mat_kg = output_kg * (1.04 + 0.08 * rng.random())
            if stage == "raw_material":
                mtype = "recycled" if rng.random() < 0.72 else "virgin"
            elif stage == "glue_unit":
                mtype = "adhesive"
            elif stage in ("pulper", "paper_machine", "corrugator", "finished"):
                mtype = rng.choice(["recycled", "virgin", "other"], p=[0.68, 0.27, 0.05])
            else:
                mtype = rng.choice(["recycled", "virgin", "other"], p=[0.55, 0.35, 0.10])

            res_rows.append(
                {
                    "ts": ts,
                    "stage_id": stage,
                    "energy_kwh": round(energy, 2),
                    "water_m3": round(water, 3),
                    "steam_bar": round(steam, 2),
                    "boiler_pct": round(boiler, 2),
                    "compressed_air_bar": round(air, 2),
                    "material_kg": round(mat_kg, 2),
                    "material_type": mtype,
                    "defect_rate": round(defect, 4),
                    "output_kg": round(output_kg, 2),
                }
            )

    return pd.DataFrame(tel_rows), pd.DataFrame(res_rows)


def write_kaggle_compatible_csvs(tel: pd.DataFrame, res: pd.DataFrame) -> None:
    """Write PIADE-shaped and resource-efficiency-shaped CSVs for the loader."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    stage_to_eq = {
        "pulper": "s_1",
        "paper_machine": "s_2",
        "corrugator": "s_3",
        "glue_unit": "s_4",
        "slitter": "s_5",
    }
    type_map = {"in_use": "production", "ready": "idle", "broken": "downtime"}
    piade_rows = []
    for _, row in tel.iterrows():
        eq = stage_to_eq.get(row["stage_id"])
        if not eq:
            continue
        elapsed = 900
        speed = row["speed_mpm"]
        po = row["throughput_tph"] * 250
        pi = po * 1.04
        piade_rows.append(
            {
                "interval_start": row["ts"],
                "equipment_ID": eq,
                "alarm": row["alarm_code"] or "",
                "type": type_map.get(row["status"], "idle"),
                "start": row["ts"],
                "end": row["ts"] + timedelta(minutes=15),
                "elapsed": elapsed,
                "pi": round(pi, 1),
                "po": round(po, 1),
                "speed": round(speed * 12, 1),
            }
        )
    pd.DataFrame(piade_rows).to_csv(DATA_DIR / "piade_raw.csv", index=False)

    stage_to_m = {s: f"M{i:03d}" for i, s in enumerate(STAGE_IDS, start=1)}
    sm_rows = []
    for _, row in res.iterrows():
        sm_rows.append(
            {
                "Timestamp": row["ts"],
                "Machine_ID": stage_to_m.get(row["stage_id"], "M001"),
                "Material_Type": row["material_type"],
                "Quantity_Used": row["material_kg"],
                "Energy_Consumption": row["energy_kwh"],
                "Production_Output": row["output_kg"],
                "Defect_Rate": row["defect_rate"],
            }
        )
    pd.DataFrame(sm_rows).to_csv(DATA_DIR / "smart_manufacturing_resource_efficiency.csv", index=False)
