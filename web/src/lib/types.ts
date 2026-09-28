export type Status = "in_use" | "ready" | "broken";

export interface Stage {
  id: string;
  label: string;
  line_id: string;
  status: Status;
  status_label: string;
  color: string;
  speed_mpm: number;
  throughput_tph: number;
  utilization_pct: number;
  quality_pct: number;
  energy_kwh: number;
  water_m3: number;
  steam_bar: number;
  boiler_pct: number;
  air_bar: number;
  material_kg: number;
  material_type: string;
  defect_rate: number;
  output_kg: number;
  alarm_code: string | null;
  spark?: number[];
}

export interface LineStatus {
  id: string;
  label: string;
  status: Status;
  status_label: string;
  utilization_pct: number;
  color: string;
}

export interface AlarmRow {
  alarm_id: number;
  ts: string;
  stage_id: string;
  line_id: string;
  severity: string;
  code: string;
  message: string;
  acknowledged: boolean;
}

export interface Kpis {
  production_tons: number;
  line_speed_mpm: number;
  paper_usage_tons: number;
  energy_mwh: number;
  oee_pct: number;
  quality_pct: number;
  d_production: number;
  d_speed: number;
  d_paper: number;
  d_energy: number;
  d_oee: number;
  d_quality: number;
}

export interface OverviewResponse {
  ts: string;
  cycle_id: number;
  source: string;
  db_ok: boolean;
  db_message: string;
  plant_status: "running" | "fault";
  stages: Stage[];
  kpis: Kpis;
  sparklines: Record<string, number[]>;
  lines: LineStatus[];
  utilities: {
    steam_bar: number;
    boiler_pct: number;
    water_m3h: number;
    air_bar: number;
    d_steam: number;
    d_boiler: number;
    d_water: number;
    d_air: number;
  };
  trend: { t: string; actual: number; target: number }[];
  energy_breakdown: { name: string; value: number }[];
  material: { name: string; tons: number; pct: number }[];
  alarms: AlarmRow[];
  alarm_open: number;
  clock: string;
}

export interface ProductionResponse {
  cycle_id: number;
  ts: string;
  lines: LineStatus[];
  series: Record<string, string | number>[];
  donuts: { id: string; label: string; oee: number; status: Status; color: string }[];
  kpis: Kpis;
}

export interface ProcessResponse {
  cycle_id: number;
  ts: string;
  panels: Stage[];
}

export interface EnergyResponse {
  cycle_id: number;
  ts: string;
  total_mwh: number;
  breakdown: { name: string; value: number }[];
  area: Record<string, string | number>[];
  kwh_per_ton: number;
}

export interface UtilitiesResponse {
  cycle_id: number;
  ts: string;
  utilities: OverviewResponse["utilities"];
  series: { t: string; steam: number; boiler: number; water: number; air: number }[];
}

export interface OeeResponse {
  cycle_id: number;
  fleet: { oee: number; availability: number; performance: number; quality: number };
  lines: {
    id: string;
    label: string;
    availability: number;
    performance: number;
    quality: number;
    oee: number;
    status: Status;
  }[];
  reasons: { name: string; value: number; color: string }[];
}

export interface SustainabilityResponse {
  cycle_id: number;
  ts: string;
  gauges: {
    recycled_pct: number;
    kwh_per_ton: number;
    water_m3h: number;
    co2_t: number;
    waste_t: number;
  };
  targets: Record<string, number>;
  mix: { name: string; value: number; color: string }[];
  energy_mix: { name: string; value: number }[];
  material: { name: string; tons: number; pct: number }[];
  alert: string;
}

export interface AlarmsResponse {
  cycle_id: number;
  open: number;
  rows: AlarmRow[];
}

export interface PlantState {
  cycle_id: number;
  cursor: number;
  stamps: number;
  db_ok: boolean;
  db_message: string;
  source: string;
  plant_status: string;
  as_of: string;
  replay_seconds: number;
}

export interface ReportPreview {
  cycle_id: number;
  ts: string;
  plant_status: string;
  kpis: Kpis;
  oee: OeeResponse["fleet"];
  sustainability: SustainabilityResponse["gauges"];
  alarms_open: number;
}
