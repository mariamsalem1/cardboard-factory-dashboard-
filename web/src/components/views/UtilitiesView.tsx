import { AirVent, Cloud, Droplets, Flame } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import type { UtilitiesResponse } from "@/lib/types";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LinearMeter, Sparkline } from "@/components/ScadaWidgets";
import { useChartColors } from "@/lib/theme";
import { signed } from "@/lib/utils";

export function UtilitiesView({ data, refreshKey }: { data: UtilitiesResponse; refreshKey: number }) {
  const colors = useChartColors();
  const u = data.utilities;
  const gauges: {
    label: string;
    value: number;
    max: number;
    unit: string;
    delta: number;
    color: string;
    icon: LucideIcon;
    key: "steam" | "boiler" | "water" | "air";
  }[] = [
    { label: "Steam", value: u.steam_bar, max: 12, unit: "bar", delta: u.d_steam, color: "#4fc3f7", icon: Cloud, key: "steam" },
    { label: "Boiler", value: u.boiler_pct, max: 100, unit: "%", delta: u.d_boiler, color: "#3dcd58", icon: Flame, key: "boiler" },
    { label: "Water", value: u.water_m3h, max: 180, unit: "m³/h", delta: u.d_water, color: "#22d3ee", icon: Droplets, key: "water" },
    { label: "Air", value: u.air_bar, max: 10, unit: "bar", delta: u.d_air, color: "#ffb020", icon: AirVent, key: "air" },
  ];
  return (
    <div key={refreshKey} className="grid gap-4 p-5 lg:grid-cols-4">
      {gauges.map((g) => {
        const Icon = g.icon;
        const spark = data.series.map((row) => Number(row[g.key]));
        return (
          <div key={g.label} className="glass-panel p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-running">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-running/15">
                  <Icon className="h-4 w-4" style={{ color: g.color }} />
                </span>
                <span className="font-mono text-[11px] uppercase text-ink-500">{g.label}</span>
              </div>
              <Sparkline data={spark} color={g.color} />
            </div>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-4xl font-bold tabular-nums" style={{ color: g.color }}>
                <AnimatedNumber value={g.value} decimals={g.unit === "%" ? 1 : 1} />
              </span>
              <span className="mb-1 font-mono text-sm text-ink-500">{g.unit}</span>
            </div>
            <div className="mt-3">
              <LinearMeter value={g.value} max={g.max} color={g.color} />
            </div>
            <div className="mt-2 font-mono text-[12px] text-running">{signed(g.delta)}</div>
          </div>
        );
      })}
      <div className="glass-panel p-4 lg:col-span-4">
        <h2 className="mb-2 font-display text-sm uppercase tracking-wider">Utility trends</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={data.series}>
              <XAxis dataKey="t" tick={{ fill: colors.axis, fontSize: 11 }} />
              <YAxis tick={{ fill: colors.axis, fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="steam" stroke="#4fc3f7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="boiler" stroke="#3dcd58" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="water" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="air" stroke="#ffb020" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
