import { useEffect, useState } from "react";
import { downloadReport, fetchReportPreview } from "@/lib/api";
import type { ReportPreview } from "@/lib/types";

export function ReportsView({ refreshKey }: { refreshKey: number }) {
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchReportPreview()
      .then(setPreview)
      .catch((e: Error) => setErr(e.message));
  }, [refreshKey]);

  return (
    <div className="p-5">
      <div className="glass-panel max-w-3xl p-6">
        <h2 className="font-display text-lg uppercase tracking-wider">Cycle snapshot</h2>
        <p className="mt-1 font-mono text-[12px] text-ink-500">
          Live numbers from the current 60s replay cycle. PDF/CSV are generated on demand.
        </p>
        {err && <div className="mt-3 text-broken">{err}</div>}
        {preview && (
          <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-sm">
            <div>Cycle <b className="block font-display text-2xl">{preview.cycle_id}</b></div>
            <div>Status <b className="block font-display text-2xl uppercase">{preview.plant_status}</b></div>
            <div>Production <b className="block font-display text-2xl">{preview.kpis.production_tons} t</b></div>
            <div>OEE <b className="block font-display text-2xl">{preview.oee.oee}%</b></div>
            <div>Energy <b className="block font-display text-2xl">{preview.kpis.energy_mwh} MWh</b></div>
            <div>Open alarms <b className="block font-display text-2xl">{preview.alarms_open}</b></div>
          </dl>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => downloadReport("pdf")}
            className="rounded-lg bg-running px-4 py-2 font-display text-sm uppercase text-ink-900"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => downloadReport("csv")}
            className="rounded-lg border border-edge px-4 py-2 font-display text-sm uppercase"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
