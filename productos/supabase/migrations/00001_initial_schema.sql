-- Multi-tenancy
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Metrics
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'engagement',
  unit TEXT DEFAULT '',
  frequency TEXT DEFAULT 'weekly',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'bigquery', 'survicate', 'jira')),
  source_config JSONB DEFAULT '{}',
  is_north_star BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID REFERENCES metrics(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  segment_type TEXT,
  segment_value TEXT,
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- OKRs
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id),
  period TEXT NOT NULL,
  level TEXT DEFAULT 'team' CHECK (level IN ('company', 'team', 'individual')),
  parent_id UUID REFERENCES objectives(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'off_track', 'done')),
  progress NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kr_type TEXT DEFAULT 'number' CHECK (kr_type IN ('number', 'percentage', 'currency', 'binary')),
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  baseline_value NUMERIC DEFAULT 0,
  weight NUMERIC DEFAULT 1,
  unit TEXT DEFAULT '',
  linked_metric_id UUID REFERENCES metrics(id) ON DELETE SET NULL,
  is_auto_tracked BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  confidence INT CHECK (confidence BETWEEN 1 AND 5),
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Sources
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bigquery', 'survicate', 'jira')),
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_metrics_workspace ON metrics(workspace_id);
CREATE INDEX idx_metrics_north_star ON metrics(workspace_id, is_north_star) WHERE is_north_star = true;
CREATE INDEX idx_metric_snapshots_metric ON metric_snapshots(metric_id, period_start DESC);
CREATE INDEX idx_metric_snapshots_segment ON metric_snapshots(metric_id, segment_type, segment_value);
CREATE INDEX idx_objectives_workspace ON objectives(workspace_id);
CREATE INDEX idx_objectives_period ON objectives(workspace_id, period);
CREATE INDEX idx_key_results_objective ON key_results(objective_id);
CREATE INDEX idx_key_results_linked_metric ON key_results(linked_metric_id) WHERE linked_metric_id IS NOT NULL;
CREATE INDEX idx_check_ins_kr ON check_ins(key_result_id, created_at DESC);
CREATE INDEX idx_data_sources_workspace ON data_sources(workspace_id);

-- RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid();
$$;

CREATE POLICY "Users see own workspaces" ON workspaces
  FOR SELECT USING (id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users see workspace members" ON workspace_members
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "Users see workspace metrics" ON metrics
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users insert workspace metrics" ON metrics
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users update workspace metrics" ON metrics
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users delete workspace metrics" ON metrics
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "Users see metric snapshots" ON metric_snapshots
  FOR SELECT USING (metric_id IN (SELECT id FROM metrics WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users insert metric snapshots" ON metric_snapshots
  FOR INSERT WITH CHECK (metric_id IN (SELECT id FROM metrics WHERE workspace_id IN (SELECT user_workspace_ids())));

CREATE POLICY "Users see workspace objectives" ON objectives
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users insert workspace objectives" ON objectives
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users update workspace objectives" ON objectives
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users delete workspace objectives" ON objectives
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "Users see key results" ON key_results
  FOR SELECT USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users insert key results" ON key_results
  FOR INSERT WITH CHECK (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users update key results" ON key_results
  FOR UPDATE USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users delete key results" ON key_results
  FOR DELETE USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));

CREATE POLICY "Users see check-ins" ON check_ins
  FOR SELECT USING (key_result_id IN (
    SELECT kr.id FROM key_results kr JOIN objectives o ON kr.objective_id = o.id
    WHERE o.workspace_id IN (SELECT user_workspace_ids())
  ));
CREATE POLICY "Users insert check-ins" ON check_ins
  FOR INSERT WITH CHECK (key_result_id IN (
    SELECT kr.id FROM key_results kr JOIN objectives o ON kr.objective_id = o.id
    WHERE o.workspace_id IN (SELECT user_workspace_ids())
  ));

CREATE POLICY "Users see workspace data sources" ON data_sources
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users insert workspace data sources" ON data_sources
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users update workspace data sources" ON data_sources
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users delete workspace data sources" ON data_sources
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids()));
