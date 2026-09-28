import { Line, LineChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  color = "#3dcd58",
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const rows = (data.length ? data : [0]).map((v, i) => ({ i, v }));
  return (
    <div className={cn("h-8 w-20", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LinearMeter({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 0.01)) * 100));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-ink-200">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const cls =
    status === "in_use" ? "bg-running" : status === "ready" ? "bg-ready" : "bg-broken";
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", cls)} />;
}

export function StatusChip({ status, label }: { status: string; label: string }) {
  const cls =
    status === "in_use"
      ? "bg-running/15 text-running"
      : status === "ready"
        ? "bg-ready/15 text-ready"
        : "bg-broken/15 text-broken";
  return (
    <span className={cn("rounded-md px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider", cls)}>
      {label}
    </span>
  );
}
