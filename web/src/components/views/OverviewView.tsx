import { Fragment } from "react";
import {
  Activity,
  AirVent,
  BadgeCheck,
  Box,
  Cloud,
  Droplets,
  Flame,
  Gauge,
  Layers,
  Zap,
} from "lucide-react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import type { OverviewResponse, Stage } from "@/lib/types";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Sparkline, StatusChip, StatusDot } from "@/components/ScadaWidgets";
import { useChartColors } from "@/lib/theme";
import { cn, signed } from "@/lib/utils";

const STAGE_ART: Record<string, string> = {
  raw_material: "/machines/stage-raw-material.png",
  pulper: "/machines/stage-pulper.png",
  paper_machine: "/machines/stage-paper-machine.png",
  corrugator: "/machines/stage-corrugator.png",
  press_drying: "/machines/stage-press-drying.png",
  glue_unit: "/machines/stage-glue-unit.png",
  slitter: "/machines/stage-slitter.png",
  finished: "/machines/stage-finished.png",
};

const STAGE_HINT: Record<string, string> = {
  raw_material: "Incoming paper rolls feeding the mill",
  pulper: "Breaks fibre into pulp slurry",
  paper_machine: "Forms and dries the paper web",
  corrugator: "Flutes and bonds liner into board",
  press_drying: "Presses and dries corrugated board",
  glue_unit: "Applies starch adhesive",
  slitter: "Slits and rewinds to order width",
  finished: "Palletized finished board",
};

const ENERGY_COLORS = ["#3dcd58", "#4fc3f7", "#ffb020", "#64748b", "#a78bfa", "#22d3ee"];

const KPIS: {
  key: keyof OverviewResponse["kpis"];
  spark: string;
  label: string;
  unit: string;
  icon: LucideIcon;
  delta: keyof OverviewResponse["kpis"];
  hint: string;
}[] = [
  { key: "production_tons", spark: "production", label: "Total Production", unit: "tons", icon: Box, delta: "d_production", hint: "Finished board output this cycle" },
  { key: "line_speed_mpm", spark: "speed", label: "Line Speed", unit: "m/min", icon: Gauge, delta: "d_speed", hint: "Corrugator line speed" },
  { key: "paper_usage_tons", spark: "paper", label: "Paper Usage", unit: "tons", icon: Layers, delta: "d_paper", hint: "Fibre consumed this cycle" },
  { key: "energy_mwh", spark: "energy", label: "Energy Consumption", unit: "MWh", icon: Zap, delta: "d_energy", hint: "Mill electrical energy this cycle" },
  { key: "oee_pct", spark: "oee", label: "OEE", unit: "%", icon: Activity, delta: "d_oee", hint: "Availability × performance × quality" },
  { key: "quality_pct", spark: "quality", label: "Product Quality", unit: "%", icon: BadgeCheck, delta: "d_quality", hint: "Good output versus defects" },
];

export function OverviewView({ data, refreshKey }: { data: OverviewResponse; refreshKey: number }) {
  const colors = useChartColors();
  return (
    <div
      key={refreshKey}
      className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1.15fr)_auto_minmax(0,1fr)] gap-2 overflow-y-auto p-2.5 md:grid-cols-3 md:overflow-hidden md:p-3"
    >
      <div className="grid grid-cols-2 gap-2 md:col-span-3 xl:grid-cols-6">
        {KPIS.map((k) => {
          const Icon = k.icon;
          const delta = Number(data.kpis[k.delta]);
          return (
            <div key={k.key} className="kpi-card-compact group" title={k.hint}>
              <div className="flex items-start justify-between">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-running/20 text-running">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="h-6 w-16">
                  <Sparkline data={data.sparklines[k.spark] ?? []} color={delta < 0 ? "#e53935" : "#3dcd58"} />
                </div>
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-500">{k.label}</div>
              <div className="flex items-end gap-1">
                <span className="font-display text-2xl font-bold leading-none tabular-nums text-ink-900">
                  <AnimatedNumber value={Number(data.kpis[k.key])} decimals={k.unit === "%" ? 1 : 0} />
                </span>
                <span className="mb-0.5 font-mono text-[11px] text-ink-500">{k.unit}</span>
              </div>
              <div className={cn("font-mono text-[11px]", delta >= 0 ? "text-running" : "text-broken")}>
                {signed(delta)}
              </div>
              <div className="pointer-events-none absolute inset-x-2 bottom-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] leading-tight text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {k.hint}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel line-board flex min-h-0 flex-col px-3 py-2 md:col-span-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="font-display text-xs uppercase tracking-[0.14em] text-ink-700">Production Line</h2>
          <div className="flex gap-3 font-mono text-[10px] uppercase">
            <span className="flex items-center gap-1"><StatusDot status="in_use" /> In use</span>
            <span className="flex items-center gap-1"><StatusDot status="ready" /> Ready</span>
            <span className="flex items-center gap-1"><StatusDot status="broken" /> Broken</span>
          </div>
        </div>
        <ProductionLine stages={data.stages} />
      </div>

      <div className="glass-panel flex min-h-0 flex-col px-3 py-2">
        <h2 className="mb-1.5 font-display text-xs uppercase tracking-[0.14em] text-ink-700">Line Status</h2>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
          {data.lines.map((ln) => (
            <div key={ln.id}>
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <span className="truncate font-display text-[12px] text-ink-800">{ln.label}</span>
                <StatusChip status={ln.status} label={ln.status_label} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-200">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${ln.utilization_pct}%`, background: ln.color }}
                />
              </div>
              <div className="mt-0.5 text-right font-mono text-[10px] text-ink-500">{ln.utilization_pct}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid h-full min-h-0 grid-cols-2 gap-2 md:col-span-2 xl:grid-cols-4">
        <UtilCard icon={Cloud} label="Steam Pressure" value={data.utilities.steam_bar} unit="bar" delta={data.utilities.d_steam} hint="Process steam header" />
        <UtilCard icon={Flame} label="Boiler Efficiency" value={data.utilities.boiler_pct} unit="%" delta={data.utilities.d_boiler} hint="Fired boiler efficiency" />
        <UtilCard icon={Droplets} label="Water Consumption" value={data.utilities.water_m3h} unit="m³/h" delta={data.utilities.d_water} hint="Process water flow" />
        <UtilCard icon={AirVent} label="Compressed Air" value={data.utilities.air_bar} unit="bar" delta={data.utilities.d_air} hint="Plant compressed air" />
      </div>

      <div className="glass-panel flex min-h-0 flex-col px-3 py-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-xs uppercase tracking-[0.14em] text-ink-700">Alarms & Events</h2>
          <span className="font-mono text-[10px] text-ink-500">{data.alarm_open} open</span>
        </div>
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
          {data.alarms.length === 0 && <li className="font-mono text-[11px] text-ink-500">No active alarms this cycle</li>}
          {data.alarms.slice(0, 4).map((a) => (
            <li key={a.alarm_id} className="flex items-start gap-2 border-b border-edge/60 pb-1.5 last:border-0">
              <StatusDot status={a.severity === "critical" ? "broken" : "ready"} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[12px]">{a.message}</div>
                <div className="font-mono text-[10px] text-ink-500">{a.ts.slice(11, 19)}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-panel flex min-h-0 flex-col px-3 py-2">
        <h2 className="mb-1 font-display text-xs uppercase tracking-[0.14em] text-ink-700">Production Trend (tons)</h2>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer>
            <ComposedChart data={data.trend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <XAxis dataKey="t" tick={{ fill: colors.axis, fontSize: 9 }} />
              <YAxis tick={{ fill: colors.axis, fontSize: 9 }} />
              <Tooltip contentStyle={{ background: colors.tooltip, border: "1px solid #2a3344" }} />
              <Bar dataKey="actual" fill="#3dcd58" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="target" stroke="#94a3b8" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel flex min-h-0 flex-col px-3 py-2">
        <h2 className="mb-1 font-display text-xs uppercase tracking-[0.14em] text-ink-700">Energy Breakdown</h2>
        <div className="flex min-h-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-[1.15] items-baseline">
            <span className="font-display text-[clamp(2.6rem,6.2vh,4.4rem)] font-bold leading-none tabular-nums tracking-tight">
              {data.kpis.energy_mwh.toLocaleString()}
            </span>
            <span className="ml-1.5 font-mono text-sm text-ink-500 xl:text-base">MWh</span>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {data.energy_breakdown.map((e, i) => (
              <li key={e.name}>
                <div className="mb-0.5 flex justify-between gap-2 font-mono text-[10px]">
                  <span className="truncate" style={{ color: ENERGY_COLORS[i % ENERGY_COLORS.length] }}>{e.name}</span>
                  <span className="shrink-0 tabular-nums">{e.value}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${e.value}%`, background: ENERGY_COLORS[i % ENERGY_COLORS.length] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-panel flex min-h-0 flex-col px-3 py-2">
        <h2 className="mb-1.5 font-display text-xs uppercase tracking-[0.14em] text-ink-700">Material Usage</h2>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
          {data.material.map((m) => (
            <div key={m.name}>
              <div className="mb-0.5 flex justify-between font-mono text-[11px]">
                <span className="truncate">{m.name}</span>
                <span className="shrink-0">{m.tons} t · {m.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-200">
                <div className="h-full rounded-full bg-running transition-all duration-700" style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductionLine({ stages }: { stages: Stage[] }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-between gap-0.5 overflow-hidden">
      {stages.map((st, i) => {
        const showPct = st.id !== "raw_material" && st.id !== "finished";
        const src = STAGE_ART[st.id];
        return (
          <Fragment key={st.id}>
            <div
              className="flex min-w-0 flex-1 flex-col items-center rounded-lg px-0.5 py-0.5 text-center transition-all duration-200 hover:bg-running/15 hover:ring-1 hover:ring-running/70"
              title={STAGE_HINT[st.id] ?? st.label}
            >
              <img
                src={src}
                alt={st.label}
                className="h-[4.4rem] w-auto max-w-full object-contain drop-shadow-md xl:h-[5.1rem]"
              />
              <div className="mt-1 font-display text-[10px] font-semibold leading-tight tracking-wide text-ink-800 xl:text-[11px]">
                {st.label}
              </div>
              {st.id === "raw_material" && (
                <div className="font-mono text-[9px] leading-tight text-ink-500">(Paper Rolls)</div>
              )}
              <div className="mt-0.5 flex items-center justify-center gap-1">
                <StatusDot status={st.status} />
                {showPct && (
                  <span className="font-display text-[13px] font-bold tabular-nums" style={{ color: st.color }}>
                    {Math.round(st.utilization_pct)}%
                  </span>
                )}
              </div>
            </div>
            {i < stages.length - 1 && (
              <svg
                viewBox="0 0 12 12"
                className="mb-6 h-3 w-3 shrink-0 xl:h-3.5 xl:w-3.5"
                aria-hidden
              >
                <path
                  d="M2 1.4 L10.2 6 L2 10.6 Z"
                  fill={st.status === "broken" ? "#e53935" : "#3dcd58"}
                />
              </svg>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function UtilCard({
  icon: Icon,
  label,
  value,
  unit,
  delta,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  delta: number;
  hint: string;
}) {
  return (
    <div className="kpi-card-compact group flex h-full min-h-0 flex-col" title={hint}>
      <div className="flex shrink-0 items-center gap-1.5 text-running">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-running/20">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">{label}</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center">
        <span className="font-display text-[clamp(2.6rem,6.2vh,4.4rem)] font-bold leading-none tabular-nums tracking-tight">
          <AnimatedNumber value={value} decimals={unit === "bar" ? 1 : 0} />
        </span>
        <span className="mb-1 ml-1.5 font-mono text-sm text-ink-500 xl:text-base">{unit}</span>
      </div>
      <div className={cn("shrink-0 font-mono text-[12px]", delta >= 0 ? "text-running" : "text-broken")}>
        {signed(delta)}
      </div>
      <div className="pointer-events-none absolute inset-x-2 bottom-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] leading-tight text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {hint}
      </div>
    </div>
  );
}
