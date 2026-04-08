import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, unit: string): string {
  if (unit === "R$" || unit === "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: value >= 1_000_000 ? "compact" : "standard",
    }).format(value);
  }
  if (unit === "%") {
    return `${value.toFixed(1)}%`;
  }
  if (unit === "h" || unit === "hours") {
    return `${value.toFixed(1)}h`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString("pt-BR");
}

export function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function getStatusFromProgress(progress: number): "on_track" | "at_risk" | "off_track" {
  if (progress >= 70) return "on_track";
  if (progress >= 40) return "at_risk";
  return "off_track";
}

export function calculateProgress(current: number, baseline: number, target: number): number {
  const range = target - baseline;
  if (range === 0) return current >= target ? 100 : 0;
  const progress = ((current - baseline) / range) * 100;
  return Math.max(0, Math.min(100, progress));
}
