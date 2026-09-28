import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProductionResponse } from "@/lib/types";
import { LinearMeter, Sparkline, StatusChip } from "@/components/ScadaWidgets";
import { useChartColors } from "@/lib/theme";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const LINE_KEYS = ["corrugated_board", "single_face", "double_wall", "packaging"] as const;
const LINE_COLORS = ["#3dcd58", "#4fc3f7", "#ffb020", "#a78bfa"];

export function ProductionView({ data, refreshKey }: { data: ProductionResponse; refreshKey: number }) {
  const colors = useChartColors();
  return (
    <div key={refreshKey} className="grid gap-4 p-5 lg:grid-cols-2">
      {data.donuts.map((d, i) => {
        const spark = data.series.map((row) => Number(row[d.id] ?? 0));
        return (
          <div key={d.id} className="glass-panel flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-sm uppercase tracking-wider">{d.label}</div>
                <StatusChip status={d.status} label={d.status} />
              </div>
              <div className="mt-1 font-display text-4xl font-bold tabular-nums" style={{ color: d.color }}>
                <AnimatedNumber value={d.oee} decimals={0} />%
              </div>
              <div className="mt-3">
                <LinearMeter value={d.oee} max={100} color={d.color} />
              </div>
              <div className="mt-2 font-mono text-[11px] text-ink-500">live utilization this cycle</div>
            </div>
            <Sparkline data={spark} color={LINE_COLORS[i]} className="h-20 w-36 shrink-0" />
          </div>
        );
      })}
      <div className="glass-panel p-4 lg:col-span-2">
        <h2 className="mb-2 font-display text-sm uppercase tracking-[0.14em]">Output by line (tons / 24h analog)</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data.series}>
              <XAxis dataKey="t" tick={{ fill: colors.axis, fontSize: 11 }} />
              <YAxis tick={{ fill: colors.axis, fontSize: 11 }} />
              <Tooltip />
              {LINE_KEYS.map((k, i) => (
                <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={LINE_COLORS[i]} fill={LINE_COLORS[i]} fillOpacity={0.35} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-panel p-4 lg:col-span-2">
        <h2 className="mb-2 font-display text-sm uppercase tracking-[0.14em]">Line comparison</h2>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={data.lines}>
              <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 11 }} />
              <YAxis tick={{ fill: colors.axis, fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="utilization_pct" radius={[4, 4, 0, 0]}>
                {data.lines.map((ln) => (
                  <Cell key={ln.id} fill={ln.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
