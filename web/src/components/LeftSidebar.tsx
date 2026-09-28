import {
  Activity,
  Bell,
  Box,
  Factory,
  FileText,
  Home,
  Leaf,
  Settings2,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabId } from "@/lib/nav";
import { BrandLockup } from "./BrandLockup";

interface LeftSidebarProps {
  currentTab: TabId;
  onNavigate: (id: TabId) => void;
  alarmCount: number;
  dbOk: boolean;
  cycleId: number | null;
}

export function LeftSidebar({ currentTab, onNavigate, alarmCount, dbOk, cycleId }: LeftSidebarProps) {
  return (
    <aside className="flex h-screen w-[236px] shrink-0 flex-col border-r border-white/10 bg-surface">
      <div className="border-b border-white/10 px-4 py-4">
        <BrandLockup />
        <div className="mt-3 font-display text-[15px] font-bold uppercase leading-tight tracking-[0.12em] text-paper-50">
          Cardboard Factory
        </div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-paper-400">
          Plant Operations
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <NavItem icon={Home} label="Overview" active={currentTab === "overview"} onClick={() => onNavigate("overview")} />
        <NavItem icon={Factory} label="Production" active={currentTab === "production"} onClick={() => onNavigate("production")} />
        <NavItem icon={Settings2} label="Process" active={currentTab === "process"} onClick={() => onNavigate("process")} />
        <NavItem icon={Zap} label="Energy" active={currentTab === "energy"} onClick={() => onNavigate("energy")} />
        <NavItem icon={Box} label="Utilities" active={currentTab === "utilities"} onClick={() => onNavigate("utilities")} />
        <NavItem icon={Activity} label="OEE" active={currentTab === "oee"} onClick={() => onNavigate("oee")} />
        <NavItem
          icon={Bell}
          label="Alarms"
          active={currentTab === "alarms"}
          onClick={() => onNavigate("alarms")}
          badge={alarmCount}
        />
        <NavItem icon={FileText} label="Reports" active={currentTab === "reports"} onClick={() => onNavigate("reports")} />
        <NavItem
          icon={Leaf}
          label="Sustainability"
          active={currentTab === "sustainability"}
          onClick={() => onNavigate("sustainability")}
        />
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => onNavigate("sustainability")}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/5"
        >
          <Leaf className="h-4 w-4 text-running" />
          <span className="font-display text-[12px] uppercase tracking-wider text-running">Sustainable Tomorrow</span>
        </button>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-paper-400">
          {dbOk ? "Historian live" : "Historian offline"} · C{cycleId ?? "—"}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-display text-[14px] tracking-[0.02em] transition-colors",
        active ? "bg-running text-ink-900" : "text-paper-300 hover:bg-white/5 hover:text-paper-50",
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-ink-900" : "text-paper-400")} />
      <span className="truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto rounded-md bg-broken px-1.5 font-mono text-[11px] text-white">{badge}</span>
      ) : null}
    </button>
  );
}
