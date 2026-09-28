import { Droplets, Leaf, Recycle, Trash2, Zap } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { LucideIcon } from "lucide-react";
import type { SustainabilityResponse } from "@/lib/types";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LinearMeter } from "@/components/ScadaWidgets";

function TargetMeter({
  label,
  value,
  unit,
  target,
  invert = false,
  icon: Icon,
}: {
  label: string;
  value: number;
  unit: string;
  target: number;
  invert?: boolean;
  icon: LucideIcon;
}) {
  const pct = invert
    ? Math.max(0, Math.min(100, (target / Math.max(value, 0.01)) * 100))
    : Math.max(0, Math.min(100, (value / target) * 100));
  const ok = invert ? value <= target : value >= target * 0.9;
  const color = ok ? "#3dcd58" : "#ffb020";
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${color}22`, color }}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-[11px] uppercase text-ink-500">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-bold tabular-nums" style={{ color }}>
        <AnimatedNumber value={value} decimals={unit === "t" || unit === "" ? 1 : 0} />
        <span className="ml-1 text-sm font-normal">{unit}</span>
      </div>
      <div className="mt-3">
        <LinearMeter value={pct} max={100} color={color} />
      </div>
      <div className="mt-1 font-mono text-[11px] text-ink-500">
        target {target}
        {unit ? ` ${unit}` : ""}
      </div>
    </div>
  );
}

export function SustainabilityView({ data, refreshKey }: { data: SustainabilityResponse; refreshKey: number }) {
  const g = data.gauges;
  const t = data.targets;
  return (
    <div key={refreshKey} className="flex flex-col gap-4 p-4 md:p-5">
      <div className="glass-panel px-4 py-3 font-display text-sm uppercase tracking-wider">{data.alert}</div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <TargetMeter label="Recycled fibre" value={g.recycled_pct} unit="%" target={t.recycled_pct} icon={Recycle} />
        <TargetMeter label="Specific energy" value={g.kwh_per_ton} unit="kWh/t" target={t.kwh_per_ton} invert icon={Zap} />
        <TargetMeter label="Water" value={g.water_m3h} unit="m³/h" target={t.water_m3h} invert icon={Droplets} />
        <TargetMeter label="CO₂" value={g.co2_t} unit="t" target={t.co2_t} invert icon={Leaf} />
        <TargetMeter label="Process waste" value={g.waste_t} unit="t" target={t.waste_t} invert icon={Trash2} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="glass-panel p-4">
          <h2 className="mb-2 font-display text-sm uppercase tracking-wider">Fibre mix</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.mix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} label>
                  {data.mix.map((m) => (
                    <Cell key={m.name} fill={m.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel p-4">
          <h2 className="mb-3 font-display text-sm uppercase tracking-wider">Material mass</h2>
          {data.material.map((m) => (
            <div key={m.name} className="mb-3">
              <div className="mb-1 flex justify-between font-mono text-[12px]">
                <span>{m.name}</span>
                <span>
                  {m.tons} t · {m.pct}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-ink-200">
                <div className="h-full rounded-full bg-running transition-all" style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
