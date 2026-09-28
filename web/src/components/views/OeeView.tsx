import { Activity, BadgeCheck, Gauge, Timer } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import type { OeeResponse } from "@/lib/types";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LinearMeter, StatusChip } from "@/components/ScadaWidgets";
import { useChartColors } from "@/lib/theme";

function oeeColor(pct: number): string {
  if (pct >= 80) return "#3dcd58";
  if (pct >= 50) return "#ffb020";
  return "#e53935";
}

export function OeeView({ data, refreshKey }: { data: OeeResponse; refreshKey: number }) {
  const colors = useChartColors();
  const fleet: { name: string; value: number; icon: LucideIcon }[] = [
    { name: "OEE", value: data.fleet.oee, icon: Activity },
    { name: "Availability", value: data.fleet.availability, icon: Timer },
    { name: "Performance", value: data.fleet.performance, icon: Gauge },
    { name: "Quality", value: data.fleet.quality, icon: BadgeCheck },
  ];
  return (
    <div key={refreshKey} className="grid gap-4 p-5 lg:grid-cols-4">
      {fleet.map((f) => {
        const Icon = f.icon;
        const col = oeeColor(f.value);
        return (
          <div key={f.name} className="glass-panel p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${col}22`, color: col }}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-mono text-[11px] uppercase text-ink-500">{f.name}</span>
            </div>
            <div className="mt-3 font-display text-4xl font-bold tabular-nums" style={{ color: col }}>
              <AnimatedNumber value={f.value} decimals={1} />%
            </div>
            <div className="mt-3">
              <LinearMeter value={f.value} max={100} color={col} />
            </div>
          </div>
        );
      })}
      <div className="glass-panel p-4 lg:col-span-2">
        <h2 className="mb-2 font-display text-sm uppercase tracking-wider">Line OEE</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data.lines}>
              <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 10 }} />
              <YAxis tick={{ fill: colors.axis, fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="availability" fill="#4fc3f7" />
              <Bar dataKey="performance" fill="#ffb020" />
              <Bar dataKey="quality" fill="#3dcd58" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.lines.map((ln) => (
            <StatusChip key={ln.id} status={ln.status} label={`${ln.label.split("-")[0].trim()} ${ln.oee.toFixed(0)}%`} />
          ))}
        </div>
      </div>
      <div className="glass-panel p-4 lg:col-span-2">
        <h2 className="mb-2 font-display text-sm uppercase tracking-wider">Loss reasons (Pareto)</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data.reasons} layout="vertical">
              <XAxis type="number" tick={{ fill: colors.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: colors.axis, fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.reasons.map((r) => (
                  <Cell key={r.name} fill={r.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
