import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SparklineChart } from "@/components/shared/sparkline-chart";
import type { Metric } from "@/types/database";
import type { SparklineDataPoint } from "@/types/metrics";

interface MetricCardProps {
  metric: Metric;
  sparklineData?: SparklineDataPoint[];
  variation?: number | null;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}

function formatValue(value: number, unit: string): string {
  if (unit === "BRL" || unit === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: value >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
    }).format(value);
  }
  if (unit === "%" || unit === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  if (unit === "days" || unit === "hours" || unit === "minutes") {
    return `${value.toFixed(1)} ${unit}`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString("pt-BR");
}

function VariationIndicator({ variation }: { variation: number }) {
  const isPositive = variation > 0;
  const isNeutral = variation === 0;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        isNeutral ? "text-gray-500" : isPositive ? "text-green-600" : "text-red-600"
      )}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(variation).toFixed(1)}%
    </span>
  );
}

export function MetricCard({
  metric,
  sparklineData = [],
  variation,
  onClick,
  isSelected,
  className,
}: MetricCardProps) {
  const hasTarget = metric.target_value !== null && metric.target_value !== undefined;
  const targetProgress = hasTarget
    ? Math.min((metric.current_value / metric.target_value!) * 100, 100)
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-white p-5 text-left transition-all hover:shadow-md",
        isSelected
          ? "border-accent shadow-md ring-1 ring-accent"
          : "border-gray-200",
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-600">
            {metric.name}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatValue(metric.current_value, metric.unit)}
          </p>
        </div>
        {variation !== null && variation !== undefined && (
          <VariationIndicator variation={variation} />
        )}
      </div>

      {sparklineData.length > 0 && (
        <div className="mt-3">
          <SparklineChart data={sparklineData} />
        </div>
      )}

      {hasTarget && targetProgress !== null && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-accent/70 transition-all"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">
            {Math.round(targetProgress)}% da meta
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
          {metric.category}
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
          {metric.source}
        </span>
      </div>
    </button>
  );
}
