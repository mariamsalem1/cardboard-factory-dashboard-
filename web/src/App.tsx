import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { OverviewView } from "@/components/views/OverviewView";
import { ProductionView } from "@/components/views/ProductionView";
import { ProcessView } from "@/components/views/ProcessView";
import { EnergyView } from "@/components/views/EnergyView";
import { UtilitiesView } from "@/components/views/UtilitiesView";
import { OeeView } from "@/components/views/OeeView";
import { SustainabilityView } from "@/components/views/SustainabilityView";
import { AlarmsView } from "@/components/views/AlarmsView";
import { ReportsView } from "@/components/views/ReportsView";
import {
  fetchAlarms,
  fetchEnergy,
  fetchOee,
  fetchOverview,
  fetchProcess,
  fetchProduction,
  fetchSustainability,
  fetchUtilities,
  postRefresh,
} from "@/lib/api";
import { PAGE_META, type TabId } from "@/lib/nav";
import type {
  AlarmsResponse,
  EnergyResponse,
  OeeResponse,
  OverviewResponse,
  ProcessResponse,
  ProductionResponse,
  SustainabilityResponse,
  UtilitiesResponse,
} from "@/lib/types";

const POLL_INTERVAL_MS = 60_000;
const POLL_SECONDS = POLL_INTERVAL_MS / 1000;

export default function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [production, setProduction] = useState<ProductionResponse | null>(null);
  const [process, setProcess] = useState<ProcessResponse | null>(null);
  const [energy, setEnergy] = useState<EnergyResponse | null>(null);
  const [utilities, setUtilities] = useState<UtilitiesResponse | null>(null);
  const [oee, setOee] = useState<OeeResponse | null>(null);
  const [sustain, setSustain] = useState<SustainabilityResponse | null>(null);
  const [alarms, setAlarms] = useState<AlarmsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pollSecondsLeft, setPollSecondsLeft] = useState(POLL_SECONDS);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [ov, pr, pc, en, ut, oe, su, al] = await Promise.all([
        fetchOverview(),
        fetchProduction(),
        fetchProcess(),
        fetchEnergy(),
        fetchUtilities(),
        fetchOee(),
        fetchSustainability(),
        fetchAlarms(),
      ]);
      setOverview(ov);
      setProduction(pr);
      setProcess(pc);
      setEnergy(en);
      setUtilities(ut);
      setOee(oe);
      setSustain(su);
      setAlarms(al);
      setRefreshKey((k) => k + 1);
      setPollSecondsLeft(POLL_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mill data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void loadAll();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(poll);
  }, [loadAll]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setPollSecondsLeft((s) => (s <= 0 ? POLL_SECONDS : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await postRefresh();
    } catch {
      /* still reload */
    }
    await loadAll();
  };

  const page = PAGE_META[tab];
  const dbOk = overview?.db_ok ?? false;
  const cycleId = overview?.cycle_id ?? null;
  const plantStatus = overview?.plant_status ?? "running";
  const alarmCount = alarms?.open ?? 0;

  return (
    <Layout
      currentTab={tab}
      onNavigate={setTab}
      page={page}
      cycleId={cycleId}
      dbOk={dbOk}
      plantStatus={plantStatus}
      onRefresh={() => void onRefresh()}
      isRefreshing={isRefreshing}
      pollSecondsLeft={pollSecondsLeft}
      alarmCount={alarmCount}
    >
      {loading && <div className="p-8 font-display uppercase tracking-wider">Loading mill historian…</div>}
      {error && <div className="p-8 text-broken">{error}</div>}
      {!loading && !error && overview && tab === "overview" && (
        <OverviewView data={overview} refreshKey={refreshKey} />
      )}
      {!loading && production && tab === "production" && (
        <ProductionView data={production} refreshKey={refreshKey} />
      )}
      {!loading && process && tab === "process" && (
        <ProcessView data={process} refreshKey={refreshKey} />
      )}
      {!loading && energy && tab === "energy" && <EnergyView data={energy} refreshKey={refreshKey} />}
      {!loading && utilities && tab === "utilities" && (
        <UtilitiesView data={utilities} refreshKey={refreshKey} />
      )}
      {!loading && oee && tab === "oee" && <OeeView data={oee} refreshKey={refreshKey} />}
      {!loading && sustain && tab === "sustainability" && (
        <SustainabilityView data={sustain} refreshKey={refreshKey} />
      )}
      {!loading && alarms && tab === "alarms" && (
        <AlarmsView data={alarms} refreshKey={refreshKey} onAck={() => void loadAll()} />
      )}
      {tab === "reports" && <ReportsView refreshKey={refreshKey} />}
    </Layout>
  );
}
