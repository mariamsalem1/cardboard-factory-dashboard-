import { motion } from "motion/react";
import { CalendarClock, Moon, RefreshCw, Radio, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PageMeta } from "@/lib/nav";
import { useTheme } from "@/lib/theme";
import { BrandLockup } from "./BrandLockup";

interface HeaderProps {
  page: PageMeta;
  cycleId: number | null;
  dbOk?: boolean;
  plantStatus?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  pollSecondsLeft?: number;
}

export function Header({
  page,
  cycleId,
  dbOk = true,
  plantStatus = "running",
  onRefresh,
  isRefreshing = false,
  pollSecondsLeft = 60,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const running = plantStatus === "running";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between border-b border-white/10 bg-surface px-5 py-3"
    >
      <div className="flex min-w-0 items-center gap-4">
        <BrandLockup compact className="hidden lg:flex" />
        <span className="hidden h-8 w-px shrink-0 bg-white/20 lg:block" aria-hidden />
        <div className="flex min-w-0 flex-col leading-tight">
          <h1 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-paper-50">
            {page.title}
          </h1>
          <span className="mt-0.5 font-mono text-[12px] uppercase tracking-[0.12em] text-paper-300">
            {page.subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-paper-200 sm:flex">
          <CalendarClock className="h-4 w-4 text-running" />
          <div className="flex flex-col text-right leading-tight">
            <span className="font-mono text-[12px] tabular-nums">
              {clock.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-paper-300">
              {clock.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 font-display text-[12px] font-semibold uppercase tracking-[0.14em]",
            running
              ? "border-running/60 bg-running-bg text-running"
              : "border-broken/70 bg-broken-bg text-broken",
          )}
        >
          <Radio className="h-3 w-3" />
          {running ? "Plant Running" : "Plant Fault"}
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 font-display text-[12px] font-semibold uppercase tracking-[0.14em]",
            dbOk ? "border-running/40 text-running" : "border-broken/50 text-broken",
          )}
        >
          {dbOk ? "SQL Live" : "SQL Offline"}
        </div>

        <div className="flex min-w-[3.5rem] flex-col text-right leading-tight">
          <span className="label-micro">Cycle</span>
          <span className="font-mono text-sm tabular-nums text-paper-50">{cycleId ?? "—"}</span>
        </div>
        <div className="flex min-w-[3.5rem] flex-col text-right leading-tight">
          <span className="label-micro">Next poll</span>
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              pollSecondsLeft <= 5 ? "text-running" : "text-paper-50",
            )}
          >
            {String(pollSecondsLeft).padStart(2, "0")}s
          </span>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-white/10 bg-surface-sunken/40">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 font-display text-[11px] uppercase tracking-wider",
              theme === "light" ? "bg-running-bg text-running" : "text-paper-300",
            )}
          >
            <Sun className="h-3.5 w-3.5" /> Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center gap-1 border-l border-white/10 px-2.5 py-1.5 font-display text-[11px] uppercase tracking-wider",
              theme === "dark" ? "bg-running-bg text-running" : "text-paper-300",
            )}
          >
            <Moon className="h-3.5 w-3.5" /> Dark
          </button>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-display text-[12px] uppercase tracking-wider text-paper-100 hover:border-running/50 hover:text-running disabled:opacity-40"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh
        </button>
      </div>
    </motion.header>
  );
}
