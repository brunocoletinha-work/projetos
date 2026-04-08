import type { Metric, MetricSnapshot, Workspace, WorkspaceMember } from "@/types/database";

export const mockWorkspace: Workspace = {
  id: "ws-1",
  name: "Onfly",
  slug: "onfly",
  created_at: "2024-01-01T00:00:00Z",
};

export const mockWorkspaceMember: WorkspaceMember = {
  id: "mem-1",
  workspace_id: "ws-1",
  user_id: "user-1",
  role: "owner",
  created_at: "2024-01-01T00:00:00Z",
};

export const mockMetricGMV: Metric = {
  id: "metric-gmv",
  workspace_id: "ws-1",
  name: "GMV",
  description: "Gross Merchandise Volume",
  category: "revenue",
  unit: "BRL",
  frequency: "monthly",
  target_value: 10000000,
  current_value: 8500000,
  source: "bigquery",
  source_config: {},
  is_north_star: true,
  is_active: true,
  display_order: 1,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockMetricNPS: Metric = {
  id: "metric-nps",
  workspace_id: "ws-1",
  name: "NPS",
  description: "Net Promoter Score",
  category: "satisfaction",
  unit: "%",
  frequency: "monthly",
  target_value: 70,
  current_value: 65,
  source: "survicate",
  source_config: {},
  is_north_star: true,
  is_active: true,
  display_order: 2,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockMetricConversion: Metric = {
  id: "metric-conv",
  workspace_id: "ws-1",
  name: "Taxa de Conversão",
  description: "Conversion rate",
  category: "growth",
  unit: "%",
  frequency: "weekly",
  target_value: 15,
  current_value: 12.5,
  source: "bigquery",
  source_config: {},
  is_north_star: false,
  is_active: true,
  display_order: 3,
  created_at: "2024-01-01T00:00:00Z",
};

export const mockSnapshots: MetricSnapshot[] = [
  {
    id: "snap-1",
    metric_id: "metric-gmv",
    value: 7000000,
    period_start: "2024-01-01T00:00:00Z",
    segment_type: null,
    segment_value: null,
    source: "bigquery",
    metadata: {},
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "snap-2",
    metric_id: "metric-gmv",
    value: 7500000,
    period_start: "2024-02-01T00:00:00Z",
    segment_type: null,
    segment_value: null,
    source: "bigquery",
    metadata: {},
    created_at: "2024-02-02T00:00:00Z",
  },
  {
    id: "snap-3",
    metric_id: "metric-gmv",
    value: 8000000,
    period_start: "2024-03-01T00:00:00Z",
    segment_type: null,
    segment_value: null,
    source: "bigquery",
    metadata: {},
    created_at: "2024-03-02T00:00:00Z",
  },
  {
    id: "snap-4",
    metric_id: "metric-gmv",
    value: 8500000,
    period_start: "2024-04-01T00:00:00Z",
    segment_type: null,
    segment_value: null,
    source: "bigquery",
    metadata: {},
    created_at: "2024-04-02T00:00:00Z",
  },
];
