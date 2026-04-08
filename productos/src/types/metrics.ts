export interface DashboardFilters {
  period: "7d" | "30d" | "90d" | "quarter";
  clientSize: string | null;
  clientId: string | null;
}

export interface MetricWithSnapshots {
  metric: import("./database").Metric;
  snapshots: import("./database").MetricSnapshot[];
  previousValue: number | null;
  variation: number | null;
}

export interface SparklineDataPoint {
  date: string;
  value: number;
}
