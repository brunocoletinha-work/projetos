import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "./metric-card";
import type { Metric } from "@/types/database";
import type { SparklineDataPoint } from "@/types/metrics";

interface NorthStarCardProps {
  metric: Metric;
  sparklineData?: SparklineDataPoint[];
  variation?: number | null;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}

export function NorthStarCard({
  metric,
  sparklineData,
  variation,
  onClick,
  isSelected,
  className,
}: NorthStarCardProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
        <Star className="h-3 w-3 fill-current" />
        North Star
      </div>
      <div
        className={cn(
          "rounded-xl border-2 pt-2",
          isSelected ? "border-accent" : "border-accent/40"
        )}
      >
        <MetricCard
          metric={metric}
          sparklineData={sparklineData}
          variation={variation}
          onClick={onClick}
          isSelected={isSelected}
          className="rounded-lg border-0 shadow-none hover:shadow-none"
        />
      </div>
    </div>
  );
}
