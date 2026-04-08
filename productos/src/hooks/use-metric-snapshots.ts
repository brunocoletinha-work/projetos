import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MetricSnapshot } from "@/types/database";
import type { SparklineDataPoint } from "@/types/metrics";
import type { Period } from "@/stores/filter-store";

function periodToStartDate(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    case "90d":
      now.setDate(now.getDate() - 90);
      break;
    case "6m":
      now.setMonth(now.getMonth() - 6);
      break;
    case "1y":
      now.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      return null;
  }
  return now.toISOString();
}

interface UseMetricSnapshotsOptions {
  metricId: string | undefined;
  period?: Period;
  limit?: number;
}

export function useMetricSnapshots({
  metricId,
  period = "30d",
  limit = 50,
}: UseMetricSnapshotsOptions) {
  const startDate = periodToStartDate(period);

  return useQuery({
    queryKey: ["snapshots", metricId, period, limit],
    enabled: !!metricId,
    queryFn: async (): Promise<MetricSnapshot[]> => {
      let query = supabase
        .from("metric_snapshots")
        .select("*")
        .eq("metric_id", metricId!)
        .order("period_start", { ascending: true })
        .limit(limit);

      if (startDate) {
        query = query.gte("period_start", startDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function snapshotsToSparkline(
  snapshots: MetricSnapshot[]
): SparklineDataPoint[] {
  return snapshots.map((s) => ({
    date: s.period_start,
    value: s.value,
  }));
}

export function getPreviousValue(snapshots: MetricSnapshot[]): number | null {
  if (snapshots.length < 2) return null;
  return snapshots[snapshots.length - 2].value;
}
