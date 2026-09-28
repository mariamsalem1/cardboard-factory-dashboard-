import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function signed(n: number, digits = 1): string {
  const v = n.toFixed(digits);
  return n > 0 ? `↑ ${v}%` : n < 0 ? `↓ ${Math.abs(n).toFixed(digits)}%` : `→ 0%`;
}

export function statusClass(status: string): string {
  if (status === "in_use") return "text-running";
  if (status === "ready") return "text-ready";
  return "text-broken";
}
