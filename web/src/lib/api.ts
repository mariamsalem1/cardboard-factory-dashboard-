import type {
  AlarmsResponse,
  EnergyResponse,
  OeeResponse,
  OverviewResponse,
  PlantState,
  ProcessResponse,
  ProductionResponse,
  ReportPreview,
  SustainabilityResponse,
  UtilitiesResponse,
} from "./types";

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body?.detail ?? body?.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const fetchOverview = () => apiJson<OverviewResponse>("/api/overview");
export const fetchProduction = () => apiJson<ProductionResponse>("/api/production");
export const fetchProcess = () => apiJson<ProcessResponse>("/api/process");
export const fetchEnergy = () => apiJson<EnergyResponse>("/api/energy");
export const fetchUtilities = () => apiJson<UtilitiesResponse>("/api/utilities");
export const fetchOee = () => apiJson<OeeResponse>("/api/oee");
export const fetchSustainability = () => apiJson<SustainabilityResponse>("/api/sustainability");
export const fetchAlarms = () => apiJson<AlarmsResponse>("/api/alarms");
export const fetchState = () => apiJson<PlantState>("/api/state");
export const fetchReportPreview = () => apiJson<ReportPreview>("/api/reports/preview");
export const postRefresh = () => apiJson<PlantState>("/api/refresh", { method: "POST" });

export async function ackAlarm(id: number): Promise<void> {
  await apiJson(`/api/alarms/${id}/acknowledge`, { method: "POST" });
}

export function downloadReport(kind: "pdf" | "csv") {
  window.open(`/api/reports/${kind}`, "_blank");
}
