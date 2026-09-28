import { useState } from "react";
import type { AlarmsResponse } from "@/lib/types";
import { ackAlarm } from "@/lib/api";
import { StatusDot } from "@/components/ScadaWidgets";
import { cn } from "@/lib/utils";

export function AlarmsView({
  data,
  refreshKey,
  onAck,
}: {
  data: AlarmsResponse;
  refreshKey: number;
  onAck: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  return (
    <div key={refreshKey} className="p-5">
      <div className="mb-4 glass-panel px-4 py-3 font-display text-sm uppercase tracking-wider">
        {data.open} open alarms · cycle {data.cycle_id}
      </div>
      <div className="overflow-hidden rounded-xl border border-edge bg-surface-elevated">
        <table className="w-full text-left">
          <thead className="bg-surface-sunken font-mono text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-3 py-2">Sev</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center font-mono text-sm text-ink-500">
                  No alarms in this replay window
                </td>
              </tr>
            )}
            {data.rows.map((a) => (
              <tr key={a.alarm_id} className={cn("border-t border-edge", a.acknowledged && "opacity-50")}>
                <td className="px-3 py-2">
                  <StatusDot status={a.severity === "critical" ? "broken" : "ready"} />
                </td>
                <td className="px-3 py-2 font-mono text-[12px]">{a.ts.replace("T", " ").slice(0, 19)}</td>
                <td className="px-3 py-2 font-display text-[14px]">{a.message}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{a.stage_id}</td>
                <td className="px-3 py-2 font-mono text-[12px]">{a.acknowledged ? "ACK" : "OPEN"}</td>
                <td className="px-3 py-2 text-right">
                  {!a.acknowledged && (
                    <button
                      type="button"
                      disabled={busy === a.alarm_id}
                      onClick={async () => {
                        setBusy(a.alarm_id);
                        try {
                          await ackAlarm(a.alarm_id);
                          onAck();
                        } finally {
                          setBusy(null);
                        }
                      }}
                      className="rounded-md bg-running px-3 py-1 font-display text-[11px] uppercase text-ink-900"
                    >
                      Ack
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
