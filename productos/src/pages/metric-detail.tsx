import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/metrics/filter-bar";
import { MetricDetailChart } from "@/components/metrics/metric-detail-chart";
import { SnapshotTable } from "@/components/metrics/snapshot-table";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useMetric } from "@/hooks/use-metrics";
import {
  useMetricSnapshots,
  snapshotsToSparkline,
  getPreviousValue,
} from "@/hooks/use-metric-snapshots";
import { useFilterStore } from "@/stores/filter-store";

function formatValue(value: number, unit: string = ""): string {
  if (unit === "BRL" || unit === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (unit === "%" || unit === "percentage") return `${value.toFixed(1)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("pt-BR");
}

export function MetricDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { period } = useFilterStore();

  const { data: metric, isLoading: loadingMetric } = useMetric(id);
  const { data: snapshots = [], isLoading: loadingSnapshots } = useMetricSnapshots({
    metricId: id,
    period,
    limit: 200,
  });

  const isLoading = loadingMetric || loadingSnapshots;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  if (!metric) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <EmptyState
          title="Métrica não encontrada"
          description="A métrica solicitada não existe ou foi removida."
        />
      </div>
    );
  }

  const chartData = snapshotsToSparkline(snapshots);
  const previousValue = getPreviousValue(snapshots);
  const variation =
    previousValue !== null && previousValue !== 0
      ? ((metric.current_value - previousValue) / Math.abs(previousValue)) * 100
      : null;

  const hasTarget =
    metric.target_value !== null && metric.target_value !== undefined;
  const targetProgress = hasTarget
    ? Math.min((metric.current_value / metric.target_value!) * 100, 100)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{metric.name}</h1>
            {metric.description && (
              <p className="text-sm text-gray-500">{metric.description}</p>
            )}
          </div>
        </div>
        <FilterBar />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-600">
              Histórico — {period}
            </h2>
            <MetricDetailChart
              data={chartData}
              targetValue={metric.target_value}
              unit={metric.unit}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-600">
              Snapshots ({snapshots.length})
            </h2>
            <SnapshotTable
              snapshots={snapshots}
              unit={metric.unit}
              currentValue={metric.current_value}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Valor atual</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {formatValue(metric.current_value, metric.unit)}
              </p>
              {variation !== null && (
                <span
                  className={`flex items-center gap-1 mt-1 text-sm font-medium ${
                    variation > 0
                      ? "text-green-600"
                      : variation < 0
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {variation === 0 ? (
                    <Minus className="h-4 w-4" />
                  ) : variation > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {variation > 0 ? "+" : ""}
                  {variation.toFixed(1)}% vs anterior
                </span>
              )}
            </div>

            {hasTarget && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-yellow-500" />
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Meta</p>
                </div>
                <p className="mt-1 text-xl font-semibold text-gray-700">
                  {formatValue(metric.target_value!, metric.unit)}
                </p>
                {targetProgress !== null && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso</span>
                      <span>{Math.round(targetProgress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-accent transition-all"
                        style={{ width: `${targetProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Fonte</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {metric.source}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {metric.frequency}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {metric.category}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
