import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { ProcessResponse } from "@/lib/types";
import { StatusChip } from "@/components/ScadaWidgets";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export function ProcessView({ data, refreshKey }: { data: ProcessResponse; refreshKey: number }) {
  return (
    <div key={refreshKey} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-4">
      {data.panels.map((p) => {
        const util = Math.max(0, Math.min(100, p.utilization_pct));
        const pie = [
          { name: "u", value: util, fill: p.color },
          { name: "r", value: 100 - util, fill: "rgba(148,163,184,0.28)" },
        ];
        const spark = (p.spark ?? []).map((v, i) => ({ i, v }));
        return (
          <section key={p.id} className="glass-panel p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-[13px] uppercase tracking-wider">{p.label}</h3>
              <StatusChip status={p.status} label={p.status_label} />
            </div>
            <div className="relative mx-auto h-28 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    startAngle={180}
                    endAngle={0}
                    cx="50%"
                    cy="100%"
                    innerRadius={40}
                    outerRadius={62}
                    stroke="none"
                  >
                    {pie.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-x-0 bottom-1 text-center font-display text-2xl font-bold tabular-nums">
                <AnimatedNumber value={util} decimals={0} />%
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                Speed <b className="block font-display text-lg">{p.speed_mpm.toFixed(0)}</b> m/min
              </div>
              <div>
                Quality <b className="block font-display text-lg">{p.quality_pct.toFixed(1)}</b> %
              </div>
              <div>
                t/h <b className="block font-display text-lg">{p.throughput_tph.toFixed(1)}</b>
              </div>
              <div>
                kWh <b className="block font-display text-lg">{p.energy_kwh.toFixed(0)}</b>
              </div>
            </div>
            <div className="mt-2 h-16">
              <ResponsiveContainer>
                <LineChart data={spark} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <Line type="monotone" dataKey="v" stroke={p.color} dot={false} strokeWidth={2} isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        );
      })}
    </div>
  );
}
