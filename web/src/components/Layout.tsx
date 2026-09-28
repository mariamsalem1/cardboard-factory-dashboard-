import type { PageMeta, TabId } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { BrandLockup } from "./BrandLockup";
import { Header } from "./Header";
import { LeftSidebar } from "./LeftSidebar";
import { PlantScene } from "./PlantScene";

interface LayoutProps {
  currentTab: TabId;
  onNavigate: (tab: TabId) => void;
  page: PageMeta;
  cycleId: number | null;
  dbOk: boolean;
  plantStatus: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  pollSecondsLeft: number;
  alarmCount: number;
  children: React.ReactNode;
}

export function Layout({
  currentTab,
  onNavigate,
  page,
  cycleId,
  dbOk,
  plantStatus,
  onRefresh,
  isRefreshing,
  pollSecondsLeft,
  alarmCount,
  children,
}: LayoutProps) {
  return (
    <div className="flex h-screen max-w-full overflow-hidden bg-page">
      <LeftSidebar
        currentTab={currentTab}
        onNavigate={onNavigate}
        alarmCount={alarmCount}
        dbOk={dbOk}
        cycleId={cycleId}
      />
      <main className="flex h-screen min-w-0 flex-1 flex-col">
        <Header
          page={page}
          cycleId={cycleId}
          dbOk={dbOk}
          plantStatus={plantStatus}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          pollSecondsLeft={pollSecondsLeft}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <PlantScene />
          <div
            className={cn(
              "relative z-10 h-full",
              currentTab === "overview" ? "overflow-hidden" : "overflow-y-auto",
            )}
          >
            {children}
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-white/10 bg-surface px-5 py-2">
          <BrandLockup compact />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper-400">
            Smarter factories · Sustainable futures
          </span>
        </footer>
      </main>
    </div>
  );
}
