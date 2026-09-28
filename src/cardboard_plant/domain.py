"""Plant ontology: stages, lines, status colors, Kaggle remaps."""

from __future__ import annotations

from typing import Literal

Status = Literal["in_use", "ready", "broken"]

STATUS_COLORS = {
    "in_use": "#3dcd58",
    "ready": "#ffb020",
    "broken": "#e53935",
}

STATUS_LABELS = {
    "in_use": "In use",
    "ready": "Ready",
    "broken": "Broken",
}

STAGES: list[dict[str, str]] = [
    {"id": "raw_material", "label": "Raw Material", "short": "Paper Rolls"},
    {"id": "pulper", "label": "Pulper", "short": "Pulper"},
    {"id": "paper_machine", "label": "Paper Machine", "short": "Paper Machine"},
    {"id": "corrugator", "label": "Corrugator", "short": "Corrugator"},
    {"id": "press_drying", "label": "Press & Drying", "short": "Press & Drying"},
    {"id": "glue_unit", "label": "Glue Unit", "short": "Glue Unit"},
    {"id": "slitter", "label": "Slitter & Rewinder", "short": "Slitter"},
    {"id": "finished", "label": "Finished Board", "short": "Finished Board"},
]

STAGE_IDS = [s["id"] for s in STAGES]
STAGE_LABEL = {s["id"]: s["label"] for s in STAGES}

LINES: list[dict[str, str]] = [
    {"id": "corrugated_board", "label": "Line 1 - Corrugated Board"},
    {"id": "single_face", "label": "Line 2 - Single Face"},
    {"id": "double_wall", "label": "Line 3 - Double Wall"},
    {"id": "packaging", "label": "Line 4 - Packaging"},
]

LINE_IDS = [ln["id"] for ln in LINES]
LINE_LABEL = {ln["id"]: ln["label"] for ln in LINES}

# PIADE equipment_ID → cardboard mill stage + line
PIADE_MAP = {
    "s_1": ("pulper", "corrugated_board"),
    "s_2": ("paper_machine", "corrugated_board"),
    "s_3": ("corrugator", "single_face"),
    "s_4": ("glue_unit", "double_wall"),
    "s_5": ("slitter", "packaging"),
}

# Resource-efficiency Machine IDs → stages
RESOURCE_MAP = {
    "M001": "raw_material",
    "M002": "pulper",
    "M003": "paper_machine",
    "M004": "corrugator",
    "M005": "press_drying",
    "M006": "glue_unit",
    "M007": "slitter",
    "M008": "finished",
    "M009": "paper_machine",
    "M010": "corrugator",
}

ENERGY_SHARES = {
    "paper_machine": 0.32,
    "press_drying": 0.28,
    "glue_unit": 0.15,
    "slitter": 0.12,
    "pulper": 0.08,
    "corrugator": 0.05,
}

MATERIAL_TYPES = ("recycled", "virgin", "adhesive", "other")


def map_piade_state(raw: str | None, alarm: str | None) -> Status:
    text = (raw or "").strip().lower()
    if alarm and str(alarm).strip() not in ("", "0", "nan", "none"):
        if text in ("production",):
            return "in_use"
        return "broken"
    if text in ("production",):
        return "in_use"
    if text in ("downtime",):
        return "broken"
    if text in ("idle", "scheduled_downtime", "performance_loss"):
        return "ready"
    return "ready"


def status_from_util(util: float, quality: float) -> Status:
    if util < 18 or quality < 88:
        return "broken"
    if util < 55:
        return "ready"
    return "in_use"
