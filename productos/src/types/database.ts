export type WorkspaceRole = "owner" | "admin" | "member";
export type MetricSource = "manual" | "bigquery" | "survicate" | "jira";
export type OkrLevel = "company" | "team" | "individual";
export type OkrStatus = "on_track" | "at_risk" | "off_track" | "done";
export type KrType = "number" | "percentage" | "currency" | "binary";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface Metric {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  frequency: string;
  target_value: number | null;
  current_value: number;
  source: MetricSource;
  source_config: Record<string, unknown>;
  is_north_star: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface MetricSnapshot {
  id: string;
  metric_id: string;
  value: number;
  period_start: string;
  segment_type: string | null;
  segment_value: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Objective {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  period: string;
  level: OkrLevel;
  parent_id: string | null;
  status: OkrStatus;
  progress: number;
  created_at: string;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  kr_type: KrType;
  current_value: number;
  target_value: number;
  baseline_value: number;
  weight: number;
  unit: string;
  linked_metric_id: string | null;
  is_auto_tracked: boolean;
  display_order: number;
  created_at: string;
}

export interface CheckIn {
  id: string;
  key_result_id: string;
  value: number;
  confidence: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DataSource {
  id: string;
  workspace_id: string;
  type: "bigquery" | "survicate" | "jira";
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
}
