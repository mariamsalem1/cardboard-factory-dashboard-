"""Load Kaggle CSVs (or generated stand-ins) into mill frames + SQL Server."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pandas as pd

from . import db
from .domain import PIADE_MAP, RESOURCE_MAP, STAGE_IDS, map_piade_state
from .generate import DATA_DIR, generate_mill_frames, write_kaggle_compatible_csvs

KAGGLE_DATASETS = [
    ("orvile/packaging-industry-anomaly-detection-dataset", "piade"),
    ("ziya07/smart-manufacturing-resource-efficiency-dataset", "smart"),
]


def try_kaggle_download() -> None:
    token = Path.home() / ".kaggle" / "kaggle.json"
    if not token.exists():
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for slug, _ in KAGGLE_DATASETS:
        try:
            subprocess.run(
                ["kaggle", "datasets", "download", "-d", slug, "-p", str(DATA_DIR), "--unzip"],
                check=False,
                timeout=120,
            )
        except Exception:
            pass


def _find_csv(hints: tuple[str, ...], exclude: tuple[str, ...] = ()) -> Path | None:
    if not DATA_DIR.exists():
        return None
    skip = {n.lower() for n in exclude}
    csvs = [p for p in DATA_DIR.rglob("*.csv") if p.name.lower() not in skip]
    for hint in hints:
        for p in csvs:
            if hint.lower() in p.name.lower():
                return p
    return None


def remap_piade(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path)
    cols = {c.lower().strip(): c for c in raw.columns}
    eq_col = cols.get("equipment_id") or cols.get("equipment_id".lower())
    for key in raw.columns:
        if key.lower() == "equipment_id":
            eq_col = key
            break
    ts_col = None
    for key in raw.columns:
        if key.lower() in ("interval_start", "start", "timestamp", "ts"):
            ts_col = key
            break
    type_col = next((c for c in raw.columns if c.lower() == "type"), None)
    alarm_col = next((c for c in raw.columns if c.lower() == "alarm"), None)
    speed_col = next((c for c in raw.columns if c.lower() == "speed"), None)
    po_col = next((c for c in raw.columns if c.lower() == "po"), None)
    if eq_col is None or ts_col is None:
        raise ValueError(f"PIADE CSV missing equipment/time columns: {list(raw.columns)}")

    frames = []
    sample = raw.tail(min(len(raw), 8000)).copy()
    sample[ts_col] = pd.to_datetime(sample[ts_col], errors="coerce")
    sample = sample.dropna(subset=[ts_col])
    for _, row in sample.iterrows():
        mapped = PIADE_MAP.get(str(row[eq_col]).strip())
        if not mapped:
            continue
        stage, line = mapped
        status = map_piade_state(
            str(row[type_col]) if type_col else None,
            str(row[alarm_col]) if alarm_col else None,
        )
        speed = float(row[speed_col]) if speed_col and pd.notna(row[speed_col]) else 280.0
        # PIADE speed is packages/hour; scale toward m/min mill analog
        speed_mpm = max(40.0, min(380.0, speed / 12.0 if speed > 400 else speed))
        po = float(row[po_col]) if po_col and pd.notna(row[po_col]) else 180.0
        tph = max(2.0, min(28.0, po / 250.0 if po > 40 else po / 12.0))
        util = 92.0 if status == "in_use" else (48.0 if status == "ready" else 16.0)
        quality = 98.4 if status != "broken" else 86.0
        alarm = None
        if alarm_col and pd.notna(row[alarm_col]) and str(row[alarm_col]).strip() not in ("", "0"):
            alarm = str(row[alarm_col])[:64]
        frames.append(
            {
                "ts": row[ts_col].to_pydatetime(),
                "stage_id": stage,
                "line_id": line,
                "status": status,
                "speed_mpm": round(speed_mpm, 2),
                "throughput_tph": round(tph, 3),
                "utilization_pct": util,
                "quality_pct": quality,
                "alarm_code": alarm if status == "broken" else None,
                "source": "kaggle_piade",
            }
        )
    return pd.DataFrame(frames)


def remap_resources(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path)
    ts_col = next((c for c in raw.columns if c.lower() in ("timestamp", "ts", "time")), raw.columns[0])
    mid_col = next((c for c in raw.columns if "machine" in c.lower()), None)
    energy_col = next((c for c in raw.columns if "energy" in c.lower()), None)
    qty_col = next((c for c in raw.columns if "quantity" in c.lower() or "material" in c.lower() and "type" not in c.lower()), None)
    out_col = next((c for c in raw.columns if "output" in c.lower() or "production" in c.lower()), None)
    def_col = next((c for c in raw.columns if "defect" in c.lower()), None)
    mat_col = next((c for c in raw.columns if "material" in c.lower() and "type" in c.lower()), None)
    raw[ts_col] = pd.to_datetime(raw[ts_col], errors="coerce")
    raw = raw.dropna(subset=[ts_col]).tail(8000)
    rows = []
    for _, row in raw.iterrows():
        mid = str(row[mid_col]).strip() if mid_col else "M001"
        stage = RESOURCE_MAP.get(mid, STAGE_IDS[hash(mid) % len(STAGE_IDS)])
        energy = float(row[energy_col]) if energy_col and pd.notna(row[energy_col]) else 40.0
        qty = float(row[qty_col]) if qty_col and pd.notna(row[qty_col]) else 80.0
        output = float(row[out_col]) if out_col and pd.notna(row[out_col]) else qty * 0.92
        defect = float(row[def_col]) if def_col and pd.notna(row[def_col]) else 0.02
        mtype = str(row[mat_col]).lower() if mat_col and pd.notna(row[mat_col]) else "recycled"
        if "recycl" in mtype:
            mtype = "recycled"
        elif "virgin" in mtype or "pulp" in mtype:
            mtype = "virgin"
        elif "adhes" in mtype or "glue" in mtype:
            mtype = "adhesive"
        else:
            mtype = "other" if mtype not in ("recycled", "virgin", "adhesive") else mtype
        rows.append(
            {
                "ts": row[ts_col].to_pydatetime(),
                "stage_id": stage,
                "energy_kwh": round(max(energy, 0.1), 2),
                "water_m3": round(max(energy, 1) * 0.012, 3),
                "steam_bar": 8.5,
                "boiler_pct": 87.0,
                "compressed_air_bar": 6.2,
                "material_kg": round(max(qty, 0.1), 2),
                "material_type": mtype,
                "defect_rate": round(min(max(defect, 0.0), 0.25), 4),
                "output_kg": round(max(output, 0.1), 2),
            }
        )
    return pd.DataFrame(rows)


def merge_with_generated(piade: pd.DataFrame | None, resources: pd.DataFrame | None) -> tuple[pd.DataFrame, pd.DataFrame]:
    gen_t, gen_r = generate_mill_frames()
    if piade is None or piade.empty:
        tel = gen_t
    else:
        tel = pd.concat([gen_t, piade], ignore_index=True)
        tel = tel.drop_duplicates(subset=["ts", "stage_id"], keep="last").sort_values("ts")
    if resources is None or resources.empty:
        res = gen_r
    else:
        res = pd.concat([gen_r, resources], ignore_index=True)
        res = res.drop_duplicates(subset=["ts", "stage_id"], keep="last").sort_values("ts")
    return tel.reset_index(drop=True), res.reset_index(drop=True)


def persist_sql(tel: pd.DataFrame, res: pd.DataFrame) -> None:
    db.ensure_database()
    with db.connection() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM mill_telemetry")
        cur.execute("DELETE FROM mill_resources")
        cur.execute("DELETE FROM mill_current_state")
        cur.execute("DELETE FROM mill_alarm")
        cur.execute("DELETE FROM replay_state")
        conn.commit()
        cur.fast_executemany = True
        tel_tuples = [
            (
                row.ts,
                row.stage_id,
                row.line_id,
                row.status,
                float(row.speed_mpm),
                float(row.throughput_tph),
                float(row.utilization_pct),
                float(row.quality_pct),
                row.alarm_code,
                row.source,
            )
            for row in tel.itertuples(index=False)
        ]
        cur.executemany(
            """INSERT INTO mill_telemetry
               (ts, stage_id, line_id, status, speed_mpm, throughput_tph,
                utilization_pct, quality_pct, alarm_code, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            tel_tuples,
        )
        res_tuples = [
            (
                row.ts,
                row.stage_id,
                float(row.energy_kwh),
                float(row.water_m3),
                float(row.steam_bar),
                float(row.boiler_pct),
                float(row.compressed_air_bar),
                float(row.material_kg),
                row.material_type,
                float(row.defect_rate),
                float(row.output_kg),
            )
            for row in res.itertuples(index=False)
        ]
        cur.executemany(
            """INSERT INTO mill_resources
               (ts, stage_id, energy_kwh, water_m3, steam_bar, boiler_pct,
                compressed_air_bar, material_kg, material_type, defect_rate, output_kg)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            res_tuples,
        )
        conn.commit()


def _write_standins(tel: pd.DataFrame, res: pd.DataFrame) -> None:
    """Best-effort CSV dump. Vercel functions cannot write the repo directory."""
    try:
        write_kaggle_compatible_csvs(tel, res)
    except OSError:
        pass


def load_frames() -> tuple[pd.DataFrame, pd.DataFrame, str]:
    try_kaggle_download()
    # Ignore CSVs we ourselves write as Kaggle-shaped stand-ins; only remap
    # third-party downloads (e.g. PIADE raw_data.csv).
    piade_path = _find_csv(
        ("raw_data", "packaging-industry", "piade_sequences"),
        exclude=("piade_raw.csv", "smart_manufacturing_resource_efficiency.csv"),
    )
    smart_path = _find_csv(
        ("resource-efficiency", "smart-manufacturing-resource"),
        exclude=("piade_raw.csv", "smart_manufacturing_resource_efficiency.csv"),
    )

    piade_df = None
    res_df = None
    if piade_path is not None:
        try:
            piade_df = remap_piade(piade_path)
        except Exception:
            piade_df = None
    if smart_path is not None:
        try:
            res_df = remap_resources(smart_path)
        except Exception:
            res_df = None

    if piade_df is None and res_df is None:
        tel, res = generate_mill_frames()
        _write_standins(tel, res)
        source = "generated"
    else:
        tel, res = merge_with_generated(piade_df, res_df)
        _write_standins(tel, res)
        source = "kaggle_mixed" if piade_df is not None and res_df is not None else (
            "kaggle_piade" if piade_df is not None else "kaggle_smart"
        )
    return tel, res, source
