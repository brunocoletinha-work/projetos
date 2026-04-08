import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart2, ExternalLink } from "lucide-react";
import { FilterBar } from "@/components/metrics/filter-bar";
import { NorthStarCard } from "@/components/metrics/north-star-card";
import { MetricCard } from "@/components/metrics/metric-card";
import { MetricDetailChart } from "@/components/metrics/metric-detail-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { useNorthStarMetrics, useMetrics } from "@/hooks/use-metrics";
import {
  useMetricSnapshots,
  snapshotsToSparkline,
  getPreviousValue,
} from "@/hooks/use-metric-snapshots";
import { useFilterStore } from "@/stores/filter-store";
import type { Metric } from "@/types/database";

function calculateVariation(
  current: number,
  previous: number | null
): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

interface MetricWithChartProps {
  metric: Metric;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isNorthStar?: boolean;
}

function MetricWithChart({
  metric,
  isSelected,
  onSelect,
  isNorthStar = false,
}: MetricWithChartProps) {
  const { period } = useFilterStore();
  const { data: snapshots = [] } = useMetricSnapshots({
    metricId: metric.id,
    period,
  });

  const sparklineData = snapshotsToSparkline(snapshots);
  const previousValue = getPreviousValue(snapshots);
  const variation = calculateVariation(metric.current_value, previousValue);

  if (isNorthStar) {
    return (
      <NorthStarCard
        metric={metric}
        sparklineData={sparklineData}
        variation={variation}
        isSelected={isSelected}
        onClick={() => onSelect(metric.id)}
      />
    );
  }

  return (
    <MetricCard
      metric={metric}
      sparklineData={sparklineData}
      variation={variation}
      isSelected={isSelected}
      onClick={() => onSelect(metric.id)}
    />
  );
}

function ExpandedChart({ metricId }: { metricId: string }) {
  const { period } = useFilterStore();
  const { data: metrics = [] } = useMetrics();
  const { data: snapshots = [] } = useMetricSnapshots({
    metricId,
    period,
    limit: 100,
  });

  const metric = metrics.find((m) => m.id === metricId);
  if (!metric) return null;

  const chartData = snapshotsToSparkline(snapshots);

  return (
    <div className="col-span-full rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{metric.name} — Histórico</h3>
        <Link
          to={`/dashboard/metrics/${metricId}`}
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          Ver detalhes
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <MetricDetailChart
        data={chartData}
        targetValue={metric.target_value}
        unit={metric.unit}
      />
    </div>
  );
}

export function DashboardPage() {
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const { data: northStarMetrics = [], isLoading: loadingNS } = useNorthStarMetrics();
  const { data: allMetrics = [], isLoading: loadingAll } = useMetrics();

  const isLoading = loadingNS || loadingAll;
  const secondaryMetrics = allMetrics.filter((m) => !m.is_north_star);

  function handleSelect(id: string) {
    setSelectedMetricId((prev) => (prev === id ? null : id));
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (allMetrics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <FilterBar />
        </div>
        <EmptyState
          icon={BarChart2}
          title="Nenhuma métrica cadastrada"
          description="Adicione métricas ao workspace para visualizar o dashboard."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <FilterBar />
      </div>

      {northStarMetrics.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            North Star Metrics
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {northStarMetrics.map((metric) => (
              <MetricWithChart
                key={metric.id}
                metric={metric}
                isSelected={selectedMetricId === metric.id}
                onSelect={handleSelect}
                isNorthStar
              />
            ))}
            {selectedMetricId &&
              northStarMetrics.some((m) => m.id === selectedMetricId) && (
                <ExpandedChart metricId={selectedMetricId} />
              )}
          </div>
        </section>
      )}

      {secondaryMetrics.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Métricas de Produto
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {secondaryMetrics.map((metric) => (
              <MetricWithChart
                key={metric.id}
                metric={metric}
                isSelected={selectedMetricId === metric.id}
                onSelect={handleSelect}
              />
            ))}
            {selectedMetricId &&
              secondaryMetrics.some((m) => m.id === selectedMetricId) && (
                <ExpandedChart metricId={selectedMetricId} />
              )}
          </div>
        </section>
      )}
    </div>
  );
}
