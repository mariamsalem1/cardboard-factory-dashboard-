import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnergyResponse } from "@/lib/types";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useChartColors } from "@/lib/theme";

const COLORS = ["#3dcd58", "#4fc3f7", "#ffb020", "#64748b", "#a78bfa"];
const KEYS = ["paper_machine", "press_drying", "glue_unit", "slitter", "pulper"] as const;

export function EnergyView({ data, refreshKey }: { data: EnergyResponse; refreshKey: number }) {
  const colors = useChartColors();
  return (
    <div key={refreshKey} className="grid gap-4 p-5 lg:grid-cols-3">
      <div className="glass-panel p-4">
        <div className="font-mono text-[11px] uppercase text-ink-500">Daily energy</div>
        <div className="font-display text-5xl font-bold tabular-nums">
          <AnimatedNumber value={data.total_mwh} decimals={0} />
          <span className="ml-2 text-lg font-normal">MWh</span>
        </div>
        <div className="mt-2 font-mono text-sm">{data.kwh_per_ton.toFixed(0)} kWh / tonne</div>
      </div>
      <div className="glass-panel p-4 lg:col-span-2">
        <h2 className="mb-2 font-display text-sm uppercase tracking-wider">Load mix</h2>
        <div className="flex h-56 items-center">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.breakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                {data.breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <ul className="w-48 space-y-1 font-mono text-[12px]">
            {data.breakdown.map((e, i) => (
              <li key={e.name} className="flex justify-between">
                <span style={{ color: COLORS[i % COLORS.length] }}>{e.name}</span>
                <span>{e.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="glass-panel p-4 lg:col-span-3">
        <h2 className="mb-2 font-display text-sm uppercase tracking-wider">Energy by stage (kWh / interval)</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data.area}>
              <XAxis dataKey="t" tick={{ fill: colors.axis, fontSize: 11 }} />
              <YAxis tick={{ fill: colors.axis, fontSize: 11 }} />
              <Tooltip />
              {KEYS.map((k, i) => (
                <Area key={k} type="monotone" dataKey={k} stackId="e" stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.45} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
