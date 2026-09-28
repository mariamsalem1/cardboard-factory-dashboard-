"""On-demand PDF/CSV snapshots of the live mill cycle."""

from __future__ import annotations

import io
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .store import STORE

_OUT = Path(__file__).resolve().parents[2] / "reports" / "out"
GREEN = colors.HexColor("#3dcd58")
INK = colors.HexColor("#1c222a")


def preview() -> dict:
    ov = STORE.overview()
    sus = STORE.sustainability()
    oee = STORE.oee()
    return {
        "cycle_id": ov["cycle_id"],
        "ts": ov["ts"],
        "plant_status": ov["plant_status"],
        "kpis": ov["kpis"],
        "oee": oee["fleet"],
        "sustainability": sus["gauges"],
        "alarms_open": ov["alarm_open"],
    }


def build_csv() -> tuple[bytes, str]:
    ov = STORE.overview()
    buf = io.StringIO()
    buf.write("metric,value\n")
    for k, v in ov["kpis"].items():
        buf.write(f"{k},{v}\n")
    buf.write(f"cycle_id,{ov['cycle_id']}\n")
    buf.write(f"ts,{ov['ts']}\n")
    name = f"cardboard-plant-cycle-{ov['cycle_id']}.csv"
    return buf.getvalue().encode("utf-8"), name


def build_pdf() -> tuple[bytes, str]:
    data = preview()
    _OUT.mkdir(parents=True, exist_ok=True)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title="Cardboard Plant Cycle Report")
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Schneider Electric · AVEVA", styles["Heading2"]),
        Paragraph("Cardboard Factory — Plant Operations Snapshot", styles["Heading1"]),
        Paragraph(f"Cycle {data['cycle_id']} · {data['ts']} · {data['plant_status'].upper()}", styles["Normal"]),
        Spacer(1, 12),
    ]
    rows = [["KPI", "Value"]]
    for k, v in data["kpis"].items():
        rows.append([k, str(v)])
    rows.append(["OEE fleet", str(data["oee"])])
    rows.append(["Sustainability", str(data["sustainability"])])
    table = Table(rows, colWidths=[220, 280])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dfe3ea")),
                ("TEXTCOLOR", (0, 1), (-1, -1), INK),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    name = f"cardboard-plant-cycle-{data['cycle_id']}.pdf"
    path = _OUT / name
    path.write_bytes(buf.getvalue())
    return buf.getvalue(), name
