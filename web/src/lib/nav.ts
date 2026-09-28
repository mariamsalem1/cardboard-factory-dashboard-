export type TabId =
  | "overview"
  | "production"
  | "process"
  | "energy"
  | "utilities"
  | "oee"
  | "sustainability"
  | "alarms"
  | "reports";

export interface PageMeta {
  title: string;
  subtitle: string;
}

export const PAGE_META: Record<TabId, PageMeta> = {
  overview: { title: "Overview", subtitle: "Plant operations · live cycle" },
  production: { title: "Production", subtitle: "Line output · speed · yield" },
  process: { title: "Process", subtitle: "Stage SCADA panels" },
  energy: { title: "Energy", subtitle: "Load mix · kWh / tonne" },
  utilities: { title: "Utilities", subtitle: "Steam · boiler · water · air" },
  oee: { title: "OEE", subtitle: "Availability · performance · quality" },
  sustainability: { title: "Sustainability", subtitle: "Recycled fibre · carbon · water" },
  alarms: { title: "Alarms", subtitle: "Live events · acknowledge" },
  reports: { title: "Reports", subtitle: "Cycle PDF / CSV snapshot" },
};
