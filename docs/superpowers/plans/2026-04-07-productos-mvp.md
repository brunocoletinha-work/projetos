# ProductOS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive product management dashboard (metrics + OKRs) for Onfly's PM team, powered by Supabase + BigQuery.

**Architecture:** React SPA with Supabase for auth/CRUD/storage and BigQuery for read-only business metrics. Multi-tenant via `workspace_id` on every table. Edge Functions proxy BigQuery queries and poll Survicate API. Seed data enables instant visual development.

**Tech Stack:** React 18, TypeScript (strict), Vite, Tailwind CSS, shadcn/ui, Recharts, TanStack Query, Zustand, React Router v6, React Hook Form + Zod, Supabase (Auth + PostgreSQL + Edge Functions), BigQuery (read-only).

---

## File Structure

```
productos/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json                    # shadcn/ui config
├── .env.local                         # Supabase URL + anon key (gitignored)
├── .env.example                       # Template for env vars
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql   # All tables + RLS
│   ├── seed.sql                       # Dev seed data
│   └── functions/
│       ├── query-bigquery/
│       │   └── index.ts               # BigQuery proxy edge function
│       └── sync-survicate/
│           └── index.ts               # Survicate poll edge function
├── src/
│   ├── main.tsx                       # App entry point
│   ├── App.tsx                        # Router + providers
│   ├── vite-env.d.ts                  # Vite type declarations
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client singleton
│   │   ├── utils.ts                   # cn() helper + shared utils
│   │   └── constants.ts              # Design tokens, status colors, periods
│   ├── types/
│   │   ├── database.ts               # Supabase DB types (generated or manual)
│   │   └── metrics.ts                # Metric, Snapshot, filter types
│   ├── stores/
│   │   ├── auth-store.ts             # Zustand: user session + workspace
│   │   ├── sidebar-store.ts          # Zustand: sidebar collapsed state
│   │   └── filter-store.ts           # Zustand: global dashboard filters
│   ├── hooks/
│   │   ├── use-auth.ts               # Auth hook wrapping Supabase auth
│   │   ├── use-metrics.ts            # TanStack Query hooks for metrics
│   │   ├── use-metric-snapshots.ts   # TanStack Query hooks for snapshots
│   │   ├── use-objectives.ts         # TanStack Query hooks for OKRs
│   │   ├── use-key-results.ts        # TanStack Query hooks for KRs
│   │   └── use-check-ins.ts          # TanStack Query hooks for check-ins
│   ├── components/
│   │   ├── ui/                       # shadcn/ui generated components
│   │   ├── layout/
│   │   │   ├── app-layout.tsx        # Sidebar + Header + Outlet wrapper
│   │   │   ├── sidebar.tsx           # Collapsible sidebar with nav links
│   │   │   ├── header.tsx            # Fixed header with breadcrumb + avatar
│   │   │   └── private-route.tsx     # Auth guard redirect to /login
│   │   ├── shared/
│   │   │   ├── progress-bar.tsx      # Auto-colored progress bar
│   │   │   ├── status-badge.tsx      # Status badge (on_track/at_risk/etc)
│   │   │   ├── sparkline-chart.tsx   # Mini chart, no axes
│   │   │   ├── empty-state.tsx       # Empty state with icon + CTA
│   │   │   ├── loading-skeleton.tsx  # Skeleton loader variants
│   │   │   └── confirm-dialog.tsx    # Delete confirmation dialog
│   │   ├── metrics/
│   │   │   ├── metric-card.tsx       # Standard KPI card
│   │   │   ├── north-star-card.tsx   # Larger featured metric card
│   │   │   ├── metric-detail-chart.tsx  # Full AreaChart for metric detail
│   │   │   ├── filter-bar.tsx        # Global filters (period, size, client)
│   │   │   └── snapshot-table.tsx    # Paginated snapshot history
│   │   └── okrs/
│   │       ├── okr-card.tsx          # Expandable OKR card with KRs
│   │       ├── kr-progress-row.tsx   # Single KR row with progress bar
│   │       ├── check-in-modal.tsx    # Check-in form modal
│   │       ├── confidence-slider.tsx # 1-5 emoji confidence slider
│   │       ├── okr-form.tsx          # Create/edit OKR form
│   │       └── check-in-timeline.tsx # Timeline of past check-ins
│   └── pages/
│       ├── login.tsx                 # Login page
│       ├── dashboard.tsx             # Dashboard page (metrics overview)
│       ├── metric-detail.tsx         # Single metric detail page
│       ├── okrs.tsx                  # OKR listing page
│       ├── okr-detail.tsx            # Single OKR detail page
│       ├── okr-new.tsx               # Create new OKR page
│       └── settings.tsx              # Settings page (profile, sources, metrics)
└── tests/
    ├── setup.ts                      # Vitest setup (happy-dom, mocks)
    ├── mocks/
    │   ├── supabase.ts               # Mock Supabase client
    │   └── data.ts                   # Shared test fixtures
    ├── components/
    │   ├── progress-bar.test.tsx
    │   ├── status-badge.test.tsx
    │   ├── metric-card.test.tsx
    │   ├── north-star-card.test.tsx
    │   ├── sparkline-chart.test.tsx
    │   ├── okr-card.test.tsx
    │   ├── confidence-slider.test.tsx
    │   └── filter-bar.test.tsx
    ├── hooks/
    │   ├── use-metrics.test.ts
    │   ├── use-objectives.test.ts
    │   └── use-check-ins.test.ts
    └── pages/
        ├── dashboard.test.tsx
        └── okrs.test.tsx
```

---

## Task 1: Project Scaffold + Tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/lib/utils.ts`, `components.json`, `.env.example`, `.gitignore`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd C:/Users/bruno.coletinha_onfl/Desktop/projetos
npm create vite@latest productos -- --template react-ts
cd productos
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install @supabase/supabase-js @tanstack/react-query zustand react-router-dom recharts react-hook-form @hookform/resolvers zod lucide-react clsx tailwind-merge class-variance-authority
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom @types/node
```

- [ ] **Step 4: Configure Tailwind with Vite plugin**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 5: Configure TypeScript paths**

Replace `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 6: Set up Tailwind CSS entry point**

Replace `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #1E3A5F;
  --color-accent: #2E86AB;
  --color-background: #F8FAFC;
  --color-status-green: #27AE60;
  --color-status-orange: #E67E22;
  --color-status-red: #E74C3C;
  --color-status-gray: #95A5A6;
  --font-family-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 12px;
  --radius-input: 8px;
}
```

- [ ] **Step 7: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted, select:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then install core components:

```bash
npx shadcn@latest add button card input label select textarea dialog dropdown-menu tabs toast skeleton badge separator sheet avatar tooltip
```

- [ ] **Step 8: Create utility helpers**

Create `src/lib/utils.ts`:

```ts
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
```

- [ ] **Step 9: Create constants**

Create `src/lib/constants.ts`:

```ts
export const STATUS_COLORS = {
  on_track: "text-status-green bg-status-green/10 border-status-green/20",
  at_risk: "text-status-orange bg-status-orange/10 border-status-orange/20",
  off_track: "text-status-red bg-status-red/10 border-status-red/20",
  done: "text-primary bg-primary/10 border-primary/20",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  on_track: "No Caminho",
  at_risk: "Em Risco",
  off_track: "Fora do Caminho",
  done: "Concluído",
};

export const LEVEL_LABELS: Record<string, string> = {
  company: "Empresa",
  team: "Time",
  individual: "Individual",
};

export const PERIODS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "quarter", label: "Trimestre atual" },
] as const;

export const CONFIDENCE_EMOJIS = ["😰", "😕", "😐", "🙂", "🤩"] as const;

export const KR_TYPES = [
  { value: "number", label: "Número" },
  { value: "percentage", label: "Porcentagem" },
  { value: "currency", label: "Moeda (R$)" },
  { value: "binary", label: "Sim/Não" },
] as const;

export const METRIC_CATEGORIES = [
  { value: "satisfaction", label: "Satisfação" },
  { value: "revenue", label: "Receita" },
  { value: "operational", label: "Operacional" },
  { value: "quality", label: "Qualidade" },
  { value: "adoption", label: "Adoção" },
] as const;
```

- [ ] **Step 10: Create environment file template**

Create `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Add to `.gitignore` (append):

```
.env.local
.env
```

- [ ] **Step 11: Create test setup**

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 12: Verify project builds and tests run**

```bash
npm run build
npm run test -- --run
```

Expected: Build succeeds with no errors. Tests run (0 tests found initially is OK).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold ProductOS with Vite + React + TS + Tailwind + shadcn"
```

---

## Task 2: Supabase Client + TypeScript Types

**Files:**
- Create: `src/lib/supabase.ts`, `src/types/database.ts`, `src/types/metrics.ts`

- [ ] **Step 1: Create database types**

Create `src/types/database.ts`:

```ts
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
```

- [ ] **Step 2: Create metric filter types**

Create `src/types/metrics.ts`:

```ts
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
```

- [ ] **Step 3: Create Supabase client**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Copy .env.example to .env.local and fill in your values."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts src/types/database.ts src/types/metrics.ts
git commit -m "feat: add Supabase client and TypeScript types for all tables"
```

---

## Task 3: Database Migration + Seed Data

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql`, `supabase/seed.sql`

- [ ] **Step 1: Create migration file with all tables + RLS**

Create `supabase/migrations/00001_initial_schema.sql`:

```sql
-- ============================================
-- ProductOS: Initial Schema
-- ============================================

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

-- ============================================
-- Indexes for performance
-- ============================================

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

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Helper: get workspace IDs for current user
CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid();
$$;

-- Workspaces: users see workspaces they belong to
CREATE POLICY "Users see own workspaces" ON workspaces
  FOR SELECT USING (id IN (SELECT user_workspace_ids()));

-- Workspace Members: users see members of their workspaces
CREATE POLICY "Users see workspace members" ON workspace_members
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));

-- Metrics: CRUD scoped to workspace
CREATE POLICY "Users see workspace metrics" ON metrics
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users insert workspace metrics" ON metrics
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users update workspace metrics" ON metrics
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users delete workspace metrics" ON metrics
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids()));

-- Metric Snapshots: accessible if metric is accessible
CREATE POLICY "Users see metric snapshots" ON metric_snapshots
  FOR SELECT USING (metric_id IN (SELECT id FROM metrics WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users insert metric snapshots" ON metric_snapshots
  FOR INSERT WITH CHECK (metric_id IN (SELECT id FROM metrics WHERE workspace_id IN (SELECT user_workspace_ids())));

-- Objectives: CRUD scoped to workspace
CREATE POLICY "Users see workspace objectives" ON objectives
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users insert workspace objectives" ON objectives
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users update workspace objectives" ON objectives
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users delete workspace objectives" ON objectives
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids()));

-- Key Results: accessible if objective is accessible
CREATE POLICY "Users see key results" ON key_results
  FOR SELECT USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users insert key results" ON key_results
  FOR INSERT WITH CHECK (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users update key results" ON key_results
  FOR UPDATE USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));
CREATE POLICY "Users delete key results" ON key_results
  FOR DELETE USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT user_workspace_ids())));

-- Check-ins: accessible if key result is accessible
CREATE POLICY "Users see check-ins" ON check_ins
  FOR SELECT USING (key_result_id IN (
    SELECT kr.id FROM key_results kr
    JOIN objectives o ON kr.objective_id = o.id
    WHERE o.workspace_id IN (SELECT user_workspace_ids())
  ));
CREATE POLICY "Users insert check-ins" ON check_ins
  FOR INSERT WITH CHECK (key_result_id IN (
    SELECT kr.id FROM key_results kr
    JOIN objectives o ON kr.objective_id = o.id
    WHERE o.workspace_id IN (SELECT user_workspace_ids())
  ));

-- Data Sources: CRUD scoped to workspace
CREATE POLICY "Users see workspace data sources" ON data_sources
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users insert workspace data sources" ON data_sources
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users update workspace data sources" ON data_sources
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY "Users delete workspace data sources" ON data_sources
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids()));
```

- [ ] **Step 2: Create seed data**

Create `supabase/seed.sql`:

```sql
-- ============================================
-- ProductOS: Seed Data for Development
-- ============================================
-- NOTE: Run this AFTER creating a user via Supabase Auth.
-- Replace 'USER_ID_HERE' with the actual auth.users UUID.
-- ============================================

-- Workspace
INSERT INTO workspaces (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Onfly', 'onfly');

-- Workspace Member (replace USER_ID_HERE after signup)
-- INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
--   ('a0000000-0000-0000-0000-000000000001', 'USER_ID_HERE', 'owner');

-- ============================================
-- Metrics (9 total: 3 north star + 6 secondary)
-- ============================================

-- North Star Metrics
INSERT INTO metrics (id, workspace_id, name, description, category, unit, frequency, target_value, current_value, source, source_config, is_north_star, display_order) VALUES
  ('m0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'GMV', 'Volume total de transações', 'revenue', 'BRL', 'monthly',
   1500000, 1200000, 'bigquery', '{"query": "SELECT SUM(amount) FROM transactions WHERE date BETWEEN @start AND @end"}',
   true, 1),
  ('m0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'NPS', 'Net Promoter Score', 'satisfaction', '', 'monthly',
   75, 72, 'survicate', '{"survey_id": "nps_main"}',
   true, 2),
  ('m0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Tempo de Aprovação', 'Tempo médio para aprovar solicitação', 'operational', 'h', 'weekly',
   2.0, 2.3, 'bigquery', '{"query": "SELECT AVG(approval_time_hours) FROM approvals WHERE date BETWEEN @start AND @end"}',
   true, 3);

-- Secondary Metrics
INSERT INTO metrics (id, workspace_id, name, description, category, unit, frequency, target_value, current_value, source, source_config, is_north_star, display_order) VALUES
  ('m0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'CSAT', 'Customer Satisfaction Score', 'satisfaction', '', 'weekly',
   4.5, 4.2, 'survicate', '{"survey_id": "csat_main"}',
   false, 4),
  ('m0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'CES', 'Customer Effort Score', 'satisfaction', '', 'weekly',
   2.5, 2.8, 'survicate', '{"survey_id": "ces_main"}',
   false, 5),
  ('m0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   '% Reservas com Aprovação', 'Reservas feitas com permissão de aprovação', 'operational', '%', 'weekly',
   80, 72, 'bigquery', '{"query": "SELECT (approved_count::float / total_count * 100) FROM booking_stats WHERE date BETWEEN @start AND @end"}',
   false, 6),
  ('m0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'Aprovações (Aprovadas/Reprovadas)', 'Ratio de aprovações', 'operational', '', 'weekly',
   NULL, 85, 'bigquery', '{"query": "SELECT approved_pct FROM approval_stats WHERE date BETWEEN @start AND @end"}',
   false, 7),
  ('m0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'Empresas com Orçamento', 'Empresas que utilizam orçamento', 'adoption', '', 'monthly',
   150, 127, 'bigquery', '{"query": "SELECT COUNT(DISTINCT company_id) FROM budget_usage WHERE date BETWEEN @start AND @end"}',
   false, 8),
  ('m0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'Taxa de Bugs', 'Bugs reportados por sprint', 'quality', '', 'weekly',
   5, 8, 'manual', '{}',
   false, 9);

-- ============================================
-- Metric Snapshots (8 weeks of data)
-- ============================================

-- GMV snapshots (weekly, increasing trend)
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000001', 950000, '2026-02-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 980000, '2026-02-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1020000, '2026-02-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1050000, '2026-03-02', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1100000, '2026-03-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1130000, '2026-03-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1170000, '2026-03-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1200000, '2026-03-30', 'bigquery');

-- NPS snapshots (monthly)
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000002', 65, '2026-02-01', 'survicate'),
  ('m0000000-0000-0000-0000-000000000002', 68, '2026-02-15', 'survicate'),
  ('m0000000-0000-0000-0000-000000000002', 70, '2026-03-01', 'survicate'),
  ('m0000000-0000-0000-0000-000000000002', 72, '2026-03-15', 'survicate');

-- Tempo de Aprovacao snapshots (weekly, decreasing is good)
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000003', 3.5, '2026-02-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000003', 3.2, '2026-02-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000003', 3.0, '2026-02-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000003', 2.8, '2026-03-02', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000003', 2.7, '2026-03-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000003', 2.5, '2026-03-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000003', 2.4, '2026-03-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000003', 2.3, '2026-03-30', 'bigquery');

-- CSAT snapshots
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000004', 3.9, '2026-02-09', 'survicate'),
  ('m0000000-0000-0000-0000-000000000004', 4.0, '2026-02-16', 'survicate'),
  ('m0000000-0000-0000-0000-000000000004', 4.0, '2026-02-23', 'survicate'),
  ('m0000000-0000-0000-0000-000000000004', 4.1, '2026-03-02', 'survicate'),
  ('m0000000-0000-0000-0000-000000000004', 4.1, '2026-03-09', 'survicate'),
  ('m0000000-0000-0000-0000-000000000004', 4.2, '2026-03-16', 'survicate'),
  ('m0000000-0000-0000-0000-000000000004', 4.2, '2026-03-23', 'survicate'),
  ('m0000000-0000-0000-0000-000000000004', 4.2, '2026-03-30', 'survicate');

-- CES snapshots (lower is better)
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000005', 3.5, '2026-02-09', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.3, '2026-02-16', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.2, '2026-02-23', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.1, '2026-03-02', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.0, '2026-03-09', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 2.9, '2026-03-16', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 2.8, '2026-03-23', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 2.8, '2026-03-30', 'survicate');

-- % Reservas com Aprovacao
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000006', 60, '2026-02-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 62, '2026-02-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 65, '2026-02-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 66, '2026-03-02', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 68, '2026-03-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 69, '2026-03-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 71, '2026-03-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 72, '2026-03-30', 'bigquery');

-- Taxa de Bugs (manual, higher is worse)
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000009', 12, '2026-02-09', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 11, '2026-02-16', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 10, '2026-02-23', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 9, '2026-03-02', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 10, '2026-03-09', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 9, '2026-03-16', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 8, '2026-03-23', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 8, '2026-03-30', 'manual');

-- ============================================
-- OKRs (3 objectives, 9 key results)
-- ============================================

-- Company OKR
INSERT INTO objectives (id, workspace_id, title, description, period, level, status, progress) VALUES
  ('o0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Aumentar satisfação e retenção dos clientes',
   'Focar em melhorar a experiência do cliente para reduzir churn e aumentar NPS',
   'Q2 2026', 'company', 'on_track', 68);

-- Team OKR 1
INSERT INTO objectives (id, workspace_id, title, description, period, level, parent_id, status, progress) VALUES
  ('o0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Otimizar fluxo de aprovações',
   'Reduzir tempo de aprovação e aumentar taxa de uso do fluxo de permissão',
   'Q2 2026', 'team', 'o0000000-0000-0000-0000-000000000001', 'at_risk', 45);

-- Team OKR 2
INSERT INTO objectives (id, workspace_id, title, description, period, level, parent_id, status, progress) VALUES
  ('o0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Escalar adoção de orçamento corporativo',
   'Aumentar o número de empresas utilizando a funcionalidade de orçamento',
   'Q2 2026', 'team', 'o0000000-0000-0000-0000-000000000001', 'on_track', 72);

-- Key Results for Company OKR
INSERT INTO key_results (id, objective_id, title, kr_type, current_value, target_value, baseline_value, weight, unit, linked_metric_id, is_auto_tracked, display_order) VALUES
  ('k0000000-0000-0000-0000-000000000001', 'o0000000-0000-0000-0000-000000000001',
   'NPS acima de 75', 'number', 72, 75, 65, 1, '', 'm0000000-0000-0000-0000-000000000002', true, 1),
  ('k0000000-0000-0000-0000-000000000002', 'o0000000-0000-0000-0000-000000000001',
   'CSAT acima de 4.5', 'number', 4.2, 4.5, 3.9, 1, '', 'm0000000-0000-0000-0000-000000000004', true, 2),
  ('k0000000-0000-0000-0000-000000000003', 'o0000000-0000-0000-0000-000000000001',
   'Reduzir CES para abaixo de 2.5', 'number', 2.8, 2.5, 3.5, 1, '', 'm0000000-0000-0000-0000-000000000005', true, 3);

-- Key Results for Team OKR 1 (Aprovacoes)
INSERT INTO key_results (id, objective_id, title, kr_type, current_value, target_value, baseline_value, weight, unit, linked_metric_id, is_auto_tracked, display_order) VALUES
  ('k0000000-0000-0000-0000-000000000004', 'o0000000-0000-0000-0000-000000000002',
   'Tempo de aprovação abaixo de 2h', 'number', 2.3, 2.0, 3.5, 2, 'h', 'm0000000-0000-0000-0000-000000000003', true, 1),
  ('k0000000-0000-0000-0000-000000000005', 'o0000000-0000-0000-0000-000000000002',
   '80% reservas com permissão de aprovação', 'percentage', 72, 80, 60, 1, '%', 'm0000000-0000-0000-0000-000000000006', true, 2),
  ('k0000000-0000-0000-0000-000000000006', 'o0000000-0000-0000-0000-000000000002',
   'Lançar novo painel de aprovação', 'binary', 0, 1, 0, 1, '', NULL, false, 3);

-- Key Results for Team OKR 2 (Orcamento)
INSERT INTO key_results (id, objective_id, title, kr_type, current_value, target_value, baseline_value, weight, unit, linked_metric_id, is_auto_tracked, display_order) VALUES
  ('k0000000-0000-0000-0000-000000000007', 'o0000000-0000-0000-0000-000000000003',
   '150 empresas usando orçamento', 'number', 127, 150, 95, 2, '', 'm0000000-0000-0000-0000-000000000008', true, 1),
  ('k0000000-0000-0000-0000-000000000008', 'o0000000-0000-0000-0000-000000000003',
   'GMV acima de R$ 1.5M', 'currency', 1200000, 1500000, 950000, 1, 'BRL', 'm0000000-0000-0000-0000-000000000001', true, 2),
  ('k0000000-0000-0000-0000-000000000009', 'o0000000-0000-0000-0000-000000000003',
   'Publicar 3 cases de sucesso', 'number', 1, 3, 0, 1, '', NULL, false, 3);

-- ============================================
-- Check-ins (4 weeks for manual KRs)
-- ============================================

-- Check-ins for "Lançar novo painel de aprovação" (binary, manual)
INSERT INTO check_ins (key_result_id, value, confidence, note, created_at) VALUES
  ('k0000000-0000-0000-0000-000000000006', 0, 3, 'Design aprovado, começando desenvolvimento', '2026-03-10T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000006', 0, 3, 'Frontend 60% concluído', '2026-03-17T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000006', 0, 2, 'Bloqueio com API de permissões, precisa de refactor', '2026-03-24T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000006', 0, 2, 'Refactor em andamento, atrasou 1 semana', '2026-03-31T10:00:00Z');

-- Check-ins for "Publicar 3 cases de sucesso" (manual)
INSERT INTO check_ins (key_result_id, value, confidence, note, created_at) VALUES
  ('k0000000-0000-0000-0000-000000000009', 0, 4, 'Entrevistas agendadas com 5 clientes', '2026-03-10T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000009', 0, 4, 'Primeiro case em revisão com cliente', '2026-03-17T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000009', 1, 4, 'Case TravelCorp publicado!', '2026-03-24T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000009', 1, 3, 'Segundo case precisa de mais dados do cliente', '2026-03-31T10:00:00Z');
```

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database migration with RLS and seed data"
```

---

## Task 4: Auth Store + Supabase Auth Hook

**Files:**
- Create: `src/stores/auth-store.ts`, `src/hooks/use-auth.ts`
- Test: `tests/hooks/use-auth.test.ts` (deferred — auth is hard to unit test without Supabase running; manual test in browser)

- [ ] **Step 1: Create auth store**

Create `src/stores/auth-store.ts`:

```ts
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Workspace } from "@/types/database";

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspace: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setWorkspace: (workspace) => set({ workspace }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, workspace: null, isLoading: false }),
}));
```

- [ ] **Step 2: Create auth hook**

Create `src/hooks/use-auth.ts`:

```ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, workspace, isLoading, setUser, setWorkspace, setLoading, reset } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadWorkspace(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadWorkspace(session.user.id);
      } else {
        reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadWorkspace(userId: string) {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(*)")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (member?.workspaces) {
      setWorkspace(member.workspaces as unknown as import("@/types/database").Workspace);
    }
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    reset();
  }

  return { user, workspace, isLoading, signIn, signOut };
}

export function useRequireAuth() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      navigate("/login", { replace: true });
    }
  }, [auth.isLoading, auth.user, navigate]);

  return auth;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/auth-store.ts src/hooks/use-auth.ts
git commit -m "feat: add auth store and Supabase auth hook"
```

---

## Task 5: Sidebar + Header + App Layout

**Files:**
- Create: `src/stores/sidebar-store.ts`, `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/components/layout/app-layout.tsx`, `src/components/layout/private-route.tsx`

- [ ] **Step 1: Create sidebar store**

Create `src/stores/sidebar-store.ts`:

```ts
import { create } from "zustand";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const savedState = typeof window !== "undefined"
  ? localStorage.getItem("sidebar-collapsed") === "true"
  : false;

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: savedState,
  toggle: () =>
    set((state) => {
      const next = !state.collapsed;
      localStorage.setItem("sidebar-collapsed", String(next));
      return { collapsed: next };
    }),
  setCollapsed: (collapsed) => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    set({ collapsed });
  },
}));
```

- [ ] **Step 2: Create sidebar component**

Create `src/components/layout/sidebar.tsx`:

```tsx
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Target, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/okrs", label: "OKRs", icon: Target },
  { path: "/settings", label: "Configurações", icon: Settings },
] as const;

export function Sidebar() {
  const { collapsed, toggle } = useSidebarStore();
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          {!collapsed && (
            <span className="text-xl font-bold text-primary">ProductOS</span>
          )}
          {collapsed && (
            <span className="text-xl font-bold text-primary mx-auto">P</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-gray-200 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="w-full justify-center"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 3: Create header component**

Create `src/components/layout/header.tsx`:

```tsx
import { useLocation, Link } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BREADCRUMB_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/okrs": "OKRs",
  "/okrs/new": "Novo OKR",
  "/settings": "Configurações",
};

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; path: string }[] = [];

  let currentPath = "";
  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    const label = BREADCRUMB_MAP[currentPath];
    if (label) {
      breadcrumbs.push({ label, path: currentPath });
    }
  }

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-400">/</span>}
            <Link
              to={crumb.path}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {crumb.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link to="/settings" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-red-600">
            <LogOut className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [ ] **Step 4: Create private route guard**

Create `src/components/layout/private-route.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Create app layout**

Create `src/components/layout/app-layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { collapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200",
          collapsed ? "ml-16" : "ml-60"
        )}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/sidebar-store.ts src/components/layout/
git commit -m "feat: add sidebar, header, app layout, and auth guard"
```

---

## Task 6: Router + Login Page + App Entry

**Files:**
- Create: `src/pages/login.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Create login page**

Create `src/pages/login.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError("Email ou senha incorretos.");
      setLoading(false);
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md rounded-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">ProductOS</CardTitle>
          <CardDescription>Sistema de Controle de Gestão de Produto</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-input"
              />
            </div>
            {error && (
              <p className="text-sm text-status-red">{error}</p>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Set up App with Router**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { PrivateRoute } from "@/components/layout/private-route";
import { LoginPage } from "@/pages/login";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AppRoutes() {
  useAuth(); // Initialize auth listener

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
        <Route path="/okrs" element={<OkrsPlaceholder />} />
        <Route path="/settings" element={<SettingsPlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function DashboardPlaceholder() {
  return <div className="text-lg text-gray-500">Dashboard — coming next</div>;
}

function OkrsPlaceholder() {
  return <div className="text-lg text-gray-500">OKRs — coming soon</div>;
}

function SettingsPlaceholder() {
  return <div className="text-lg text-gray-500">Settings — coming soon</div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Update main.tsx**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Install sonner for toasts**

```bash
npx shadcn@latest add sonner
```

- [ ] **Step 5: Verify dev server runs**

```bash
npm run dev
```

Open http://localhost:5173 — should see login page with ProductOS branding. After login (needs Supabase project configured), should see sidebar + header + placeholder content.

- [ ] **Step 6: Commit**

```bash
git add src/pages/login.tsx src/App.tsx src/main.tsx
git commit -m "feat: add routing, login page, and app shell with placeholders"
```

---

## Task 7: Shared UI Components (ProgressBar, StatusBadge, EmptyState, LoadingSkeleton)

**Files:**
- Create: `src/components/shared/progress-bar.tsx`, `src/components/shared/status-badge.tsx`, `src/components/shared/empty-state.tsx`, `src/components/shared/loading-skeleton.tsx`, `src/components/shared/confirm-dialog.tsx`
- Test: `tests/components/progress-bar.test.tsx`, `tests/components/status-badge.test.tsx`

- [ ] **Step 1: Write progress bar test**

Create `tests/components/progress-bar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "@/components/shared/progress-bar";

describe("ProgressBar", () => {
  it("renders with correct width percentage", () => {
    render(<ProgressBar value={65} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeInTheDocument();
    expect(bar.getAttribute("aria-valuenow")).toBe("65");
  });

  it("clamps value between 0 and 100", () => {
    render(<ProgressBar value={150} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("applies green color for values >= 70", () => {
    const { container } = render(<ProgressBar value={80} />);
    const fill = container.querySelector("[data-fill]");
    expect(fill?.className).toContain("bg-status-green");
  });

  it("applies orange color for values 40-69", () => {
    const { container } = render(<ProgressBar value={50} />);
    const fill = container.querySelector("[data-fill]");
    expect(fill?.className).toContain("bg-status-orange");
  });

  it("applies red color for values < 40", () => {
    const { container } = render(<ProgressBar value={20} />);
    const fill = container.querySelector("[data-fill]");
    expect(fill?.className).toContain("bg-status-red");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/progress-bar.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ProgressBar**

Create `src/components/shared/progress-bar.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

function getColorClass(value: number): string {
  if (value >= 70) return "bg-status-green";
  if (value >= 40) return "bg-status-orange";
  return "bg-status-red";
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
      >
        <div
          data-fill
          className={cn("h-full rounded-full transition-all duration-300", getColorClass(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-600 tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/progress-bar.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Write status badge test**

Create `tests/components/status-badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders correct label for on_track", () => {
    render(<StatusBadge status="on_track" />);
    expect(screen.getByText("No Caminho")).toBeInTheDocument();
  });

  it("renders correct label for at_risk", () => {
    render(<StatusBadge status="at_risk" />);
    expect(screen.getByText("Em Risco")).toBeInTheDocument();
  });

  it("renders correct label for off_track", () => {
    render(<StatusBadge status="off_track" />);
    expect(screen.getByText("Fora do Caminho")).toBeInTheDocument();
  });

  it("renders correct label for done", () => {
    render(<StatusBadge status="done" />);
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx vitest run tests/components/status-badge.test.tsx
```

Expected: FAIL.

- [ ] **Step 7: Implement StatusBadge**

Create `src/components/shared/status-badge.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { OkrStatus } from "@/types/database";

interface StatusBadgeProps {
  status: OkrStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border",
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npx vitest run tests/components/status-badge.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 9: Implement EmptyState, LoadingSkeleton, ConfirmDialog**

Create `src/components/shared/empty-state.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-accent hover:bg-accent/90">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

Create `src/components/shared/loading-skeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="rounded-card border bg-white p-6 shadow-sm">
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="mb-1 h-8 w-32" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-12 w-full" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-3 h-2 w-full" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-card border bg-white p-6 shadow-sm">
      <Skeleton className="mb-4 h-5 w-32" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

Create `src/components/shared/confirm-dialog.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-status-red hover:bg-status-red/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 10: Install alert-dialog component**

```bash
npx shadcn@latest add alert-dialog
```

- [ ] **Step 11: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/shared/ tests/components/
git commit -m "feat: add shared UI components (ProgressBar, StatusBadge, EmptyState, LoadingSkeleton, ConfirmDialog)"
```

---

## Task 8: SparklineChart Component

**Files:**
- Create: `src/components/shared/sparkline-chart.tsx`
- Test: `tests/components/sparkline-chart.test.tsx`

- [ ] **Step 1: Write test**

Create `tests/components/sparkline-chart.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SparklineChart } from "@/components/shared/sparkline-chart";

describe("SparklineChart", () => {
  it("renders without crashing with data", () => {
    const data = [
      { date: "2026-03-01", value: 10 },
      { date: "2026-03-08", value: 15 },
      { date: "2026-03-15", value: 12 },
    ];
    const { container } = render(<SparklineChart data={data} />);
    expect(container.querySelector(".recharts-wrapper")).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    const { container } = render(<SparklineChart data={[]} />);
    expect(container.querySelector(".recharts-wrapper")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/sparkline-chart.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement SparklineChart**

Create `src/components/shared/sparkline-chart.tsx`:

```tsx
import { ResponsiveContainer, LineChart, Line } from "recharts";
import type { SparklineDataPoint } from "@/types/metrics";
import { cn } from "@/lib/utils";

interface SparklineChartProps {
  data: SparklineDataPoint[];
  color?: string;
  className?: string;
}

export function SparklineChart({ data, color = "#2E86AB", className }: SparklineChartProps) {
  if (data.length === 0) {
    return <div className={cn("h-10 w-full", className)} />;
  }

  return (
    <div className={cn("h-10 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/sparkline-chart.test.tsx
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/sparkline-chart.tsx tests/components/sparkline-chart.test.tsx
git commit -m "feat: add SparklineChart component"
```

---

## Task 9: Filter Store + FilterBar Component

**Files:**
- Create: `src/stores/filter-store.ts`, `src/components/metrics/filter-bar.tsx`
- Test: `tests/components/filter-bar.test.tsx`

- [ ] **Step 1: Create filter store**

Create `src/stores/filter-store.ts`:

```ts
import { create } from "zustand";
import type { DashboardFilters } from "@/types/metrics";

interface FilterState extends DashboardFilters {
  setPeriod: (period: DashboardFilters["period"]) => void;
  setClientSize: (size: string | null) => void;
  setClientId: (id: string | null) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  period: "30d",
  clientSize: null,
  clientId: null,
  setPeriod: (period) => set({ period }),
  setClientSize: (clientSize) => set({ clientSize }),
  setClientId: (clientId) => set({ clientId }),
  reset: () => set({ period: "30d", clientSize: null, clientId: null }),
}));
```

- [ ] **Step 2: Write filter bar test**

Create `tests/components/filter-bar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FilterBar } from "@/components/metrics/filter-bar";

describe("FilterBar", () => {
  it("renders period selector", () => {
    render(<FilterBar />);
    expect(screen.getByText("Últimos 30 dias")).toBeInTheDocument();
  });

  it("renders size filter", () => {
    render(<FilterBar />);
    expect(screen.getByText("Todos os sizes")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/components/filter-bar.test.tsx
```

Expected: FAIL.

- [ ] **Step 4: Implement FilterBar**

Create `src/components/metrics/filter-bar.tsx`:

```tsx
import { useFilterStore } from "@/stores/filter-store";
import { PERIODS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardFilters } from "@/types/metrics";

const CLIENT_SIZES = [
  { value: "all", label: "Todos os sizes" },
  { value: "enterprise", label: "Enterprise" },
  { value: "mid_market", label: "Mid Market" },
  { value: "smb", label: "PME" },
] as const;

export function FilterBar() {
  const { period, clientSize, setPeriod, setClientSize } = useFilterStore();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={period}
        onValueChange={(v) => setPeriod(v as DashboardFilters["period"])}
      >
        <SelectTrigger className="w-48 rounded-input">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={clientSize ?? "all"}
        onValueChange={(v) => setClientSize(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-44 rounded-input">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CLIENT_SIZES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/components/filter-bar.test.tsx
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stores/filter-store.ts src/components/metrics/filter-bar.tsx tests/components/filter-bar.test.tsx
git commit -m "feat: add dashboard filter store and FilterBar component"
```

---

## Task 10: MetricCard + NorthStarCard Components

**Files:**
- Create: `src/components/metrics/metric-card.tsx`, `src/components/metrics/north-star-card.tsx`
- Test: `tests/components/metric-card.test.tsx`, `tests/components/north-star-card.test.tsx`

- [ ] **Step 1: Write MetricCard test**

Create `tests/components/metric-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MetricCard } from "@/components/metrics/metric-card";

const mockMetric = {
  name: "GMV",
  currentValue: 1200000,
  previousValue: 1100000,
  unit: "BRL",
  targetValue: 1500000,
  sparklineData: [
    { date: "2026-03-01", value: 1000000 },
    { date: "2026-03-15", value: 1100000 },
    { date: "2026-03-30", value: 1200000 },
  ],
};

describe("MetricCard", () => {
  it("renders metric name", () => {
    render(<MetricCard {...mockMetric} />);
    expect(screen.getByText("GMV")).toBeInTheDocument();
  });

  it("renders formatted current value", () => {
    render(<MetricCard {...mockMetric} />);
    // R$ 1,2 mi or similar formatted value
    expect(screen.getByText(/1,2/)).toBeInTheDocument();
  });

  it("renders positive variation with up arrow", () => {
    render(<MetricCard {...mockMetric} />);
    expect(screen.getByText(/9\.1%/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/metric-card.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement MetricCard**

Create `src/components/metrics/metric-card.tsx`:

```tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SparklineChart } from "@/components/shared/sparkline-chart";
import { formatNumber, calculateVariation } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SparklineDataPoint } from "@/types/metrics";

interface MetricCardProps {
  name: string;
  currentValue: number;
  previousValue: number | null;
  unit: string;
  targetValue: number | null;
  sparklineData: SparklineDataPoint[];
  onClick?: () => void;
  className?: string;
}

export function MetricCard({
  name,
  currentValue,
  previousValue,
  unit,
  targetValue,
  sparklineData,
  onClick,
  className,
}: MetricCardProps) {
  const variation = previousValue !== null ? calculateVariation(currentValue, previousValue) : null;
  const metTarget = targetValue !== null && currentValue >= targetValue;

  return (
    <Card
      className={cn(
        "cursor-pointer rounded-card shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <p className="text-sm font-medium text-gray-500">{name}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatNumber(currentValue, unit)}
        </p>

        {variation !== null && (
          <div className="mt-1 flex items-center gap-1">
            {variation > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-status-green" />
            ) : variation < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 text-status-red" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-status-gray" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                variation > 0 ? "text-status-green" : variation < 0 ? "text-status-red" : "text-status-gray"
              )}
            >
              {Math.abs(variation).toFixed(1)}%
            </span>
          </div>
        )}

        <SparklineChart data={sparklineData} className="mt-3" />

        {targetValue !== null && (
          <div className="mt-2 flex items-center gap-1.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                metTarget ? "bg-status-green" : "bg-status-orange"
              )}
            />
            <span className="text-xs text-gray-500">
              Meta: {formatNumber(targetValue, unit)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/metric-card.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 5: Write NorthStarCard test**

Create `tests/components/north-star-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NorthStarCard } from "@/components/metrics/north-star-card";

describe("NorthStarCard", () => {
  it("renders with larger styling", () => {
    const { container } = render(
      <NorthStarCard
        name="GMV"
        currentValue={1200000}
        previousValue={1100000}
        unit="BRL"
        targetValue={1500000}
        sparklineData={[]}
      />
    );
    // NorthStarCard wraps MetricCard with extra styling
    expect(container.querySelector(".border-accent")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Implement NorthStarCard**

Create `src/components/metrics/north-star-card.tsx`:

```tsx
import { MetricCard } from "./metric-card";
import type { SparklineDataPoint } from "@/types/metrics";

interface NorthStarCardProps {
  name: string;
  currentValue: number;
  previousValue: number | null;
  unit: string;
  targetValue: number | null;
  sparklineData: SparklineDataPoint[];
  onClick?: () => void;
}

export function NorthStarCard(props: NorthStarCardProps) {
  return (
    <MetricCard
      {...props}
      className="border-accent/30 border-2 bg-white"
    />
  );
}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/metrics/ tests/components/metric-card.test.tsx tests/components/north-star-card.test.tsx
git commit -m "feat: add MetricCard and NorthStarCard components"
```

---

## Task 11: Metrics Data Hook

**Files:**
- Create: `src/hooks/use-metrics.ts`, `src/hooks/use-metric-snapshots.ts`
- Test: `tests/mocks/supabase.ts`, `tests/mocks/data.ts`, `tests/hooks/use-metrics.test.ts`

- [ ] **Step 1: Create test mocks**

Create `tests/mocks/supabase.ts`:

```ts
import { vi } from "vitest";

export function createMockSupabaseClient() {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn(),
  });

  return {
    from: mockFrom,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    functions: {
      invoke: vi.fn(),
    },
  };
}
```

Create `tests/mocks/data.ts`:

```ts
import type { Metric, MetricSnapshot, Objective, KeyResult, CheckIn } from "@/types/database";

export const MOCK_WORKSPACE_ID = "a0000000-0000-0000-0000-000000000001";

export const mockMetrics: Metric[] = [
  {
    id: "m001",
    workspace_id: MOCK_WORKSPACE_ID,
    name: "GMV",
    description: "Volume total de transações",
    category: "revenue",
    unit: "BRL",
    frequency: "monthly",
    target_value: 1500000,
    current_value: 1200000,
    source: "bigquery",
    source_config: {},
    is_north_star: true,
    is_active: true,
    display_order: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "m002",
    workspace_id: MOCK_WORKSPACE_ID,
    name: "NPS",
    description: "Net Promoter Score",
    category: "satisfaction",
    unit: "",
    frequency: "monthly",
    target_value: 75,
    current_value: 72,
    source: "survicate",
    source_config: {},
    is_north_star: true,
    is_active: true,
    display_order: 2,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "m003",
    workspace_id: MOCK_WORKSPACE_ID,
    name: "Tempo de Aprovação",
    description: "Tempo médio para aprovar",
    category: "operational",
    unit: "h",
    frequency: "weekly",
    target_value: 2.0,
    current_value: 2.3,
    source: "bigquery",
    source_config: {},
    is_north_star: true,
    is_active: true,
    display_order: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const mockSnapshots: MetricSnapshot[] = [
  { id: "s1", metric_id: "m001", value: 1100000, period_start: "2026-03-16", segment_type: null, segment_value: null, source: "bigquery", metadata: {}, created_at: "2026-03-16T00:00:00Z" },
  { id: "s2", metric_id: "m001", value: 1200000, period_start: "2026-03-23", segment_type: null, segment_value: null, source: "bigquery", metadata: {}, created_at: "2026-03-23T00:00:00Z" },
];

export const mockObjectives: Objective[] = [
  {
    id: "o001",
    workspace_id: MOCK_WORKSPACE_ID,
    title: "Aumentar satisfação do cliente",
    description: "Focar em melhorar a experiência",
    owner_id: null,
    period: "Q2 2026",
    level: "company",
    parent_id: null,
    status: "on_track",
    progress: 68,
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const mockKeyResults: KeyResult[] = [
  {
    id: "k001",
    objective_id: "o001",
    title: "NPS acima de 75",
    kr_type: "number",
    current_value: 72,
    target_value: 75,
    baseline_value: 65,
    weight: 1,
    unit: "",
    linked_metric_id: "m002",
    is_auto_tracked: true,
    display_order: 1,
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const mockCheckIns: CheckIn[] = [
  {
    id: "c001",
    key_result_id: "k001",
    value: 70,
    confidence: 4,
    note: "Melhorando semana a semana",
    created_by: null,
    created_at: "2026-03-24T10:00:00Z",
  },
];
```

- [ ] **Step 2: Implement metrics hook**

Create `src/hooks/use-metrics.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import type { Metric } from "@/types/database";

export function useMetrics() {
  const workspace = useAuthStore((s) => s.workspace);

  return useQuery<Metric[]>({
    queryKey: ["metrics", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspace,
  });
}

export function useNorthStarMetrics() {
  const workspace = useAuthStore((s) => s.workspace);

  return useQuery<Metric[]>({
    queryKey: ["metrics", "north-star", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("is_north_star", true)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspace,
  });
}

export function useMetric(metricId: string | undefined) {
  return useQuery<Metric | null>({
    queryKey: ["metric", metricId],
    queryFn: async () => {
      if (!metricId) return null;
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("id", metricId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!metricId,
  });
}
```

- [ ] **Step 3: Implement metric snapshots hook**

Create `src/hooks/use-metric-snapshots.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFilterStore } from "@/stores/filter-store";
import type { MetricSnapshot } from "@/types/database";
import type { DashboardFilters, SparklineDataPoint } from "@/types/metrics";

function getDateRange(period: DashboardFilters["period"]): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "quarter": {
      const q = Math.floor(end.getMonth() / 3);
      start.setMonth(q * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function useMetricSnapshots(metricId: string | undefined) {
  const { period, clientSize } = useFilterStore();
  const range = getDateRange(period);

  return useQuery<MetricSnapshot[]>({
    queryKey: ["metric-snapshots", metricId, period, clientSize],
    queryFn: async () => {
      if (!metricId) return [];
      let query = supabase
        .from("metric_snapshots")
        .select("*")
        .eq("metric_id", metricId)
        .gte("period_start", range.start)
        .lte("period_start", range.end)
        .order("period_start", { ascending: true });

      if (clientSize) {
        query = query.eq("segment_type", "client_size").eq("segment_value", clientSize);
      } else {
        query = query.is("segment_type", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!metricId,
  });
}

export function snapshotsToSparkline(snapshots: MetricSnapshot[]): SparklineDataPoint[] {
  return snapshots.map((s) => ({
    date: s.period_start,
    value: s.value,
  }));
}

export function getPreviousValue(snapshots: MetricSnapshot[]): number | null {
  if (snapshots.length < 2) return null;
  return snapshots[snapshots.length - 2].value;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-metrics.ts src/hooks/use-metric-snapshots.ts tests/mocks/
git commit -m "feat: add metrics and snapshots data hooks with filter support"
```

---

## Task 12: Dashboard Page

**Files:**
- Create: `src/pages/dashboard.tsx`, `src/components/metrics/metric-detail-chart.tsx`
- Modify: `src/App.tsx` (replace placeholder)

- [ ] **Step 1: Implement MetricDetailChart**

Create `src/components/metrics/metric-detail-chart.tsx`:

```tsx
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricSnapshot } from "@/types/database";
import { formatNumber } from "@/lib/utils";

interface MetricDetailChartProps {
  title: string;
  snapshots: MetricSnapshot[];
  unit: string;
  targetValue: number | null;
}

export function MetricDetailChart({ title, snapshots, unit, targetValue }: MetricDetailChartProps) {
  const data = snapshots.map((s) => ({
    date: new Date(s.period_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    value: s.value,
  }));

  return (
    <Card className="rounded-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E86AB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2E86AB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: number) => [formatNumber(value, unit), title]}
                labelStyle={{ color: "#666" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2E86AB"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
              {targetValue !== null && (
                <ReferenceLine
                  y={targetValue}
                  stroke="#E67E22"
                  strokeDasharray="5 5"
                  label={{ value: `Meta: ${formatNumber(targetValue, unit)}`, position: "right", fontSize: 11 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Implement Dashboard page**

Create `src/pages/dashboard.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilterBar } from "@/components/metrics/filter-bar";
import { NorthStarCard } from "@/components/metrics/north-star-card";
import { MetricCard } from "@/components/metrics/metric-card";
import { MetricDetailChart } from "@/components/metrics/metric-detail-chart";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useMetrics, useNorthStarMetrics } from "@/hooks/use-metrics";
import { useMetricSnapshots, snapshotsToSparkline, getPreviousValue } from "@/hooks/use-metric-snapshots";
import { BarChart3 } from "lucide-react";
import type { Metric } from "@/types/database";

function MetricCardWithData({ metric, onClick, isNorthStar }: { metric: Metric; onClick: () => void; isNorthStar: boolean }) {
  const { data: snapshots = [] } = useMetricSnapshots(metric.id);
  const sparklineData = snapshotsToSparkline(snapshots);
  const previousValue = getPreviousValue(snapshots);

  const CardComponent = isNorthStar ? NorthStarCard : MetricCard;

  return (
    <CardComponent
      name={metric.name}
      currentValue={metric.current_value}
      previousValue={previousValue}
      unit={metric.unit}
      targetValue={metric.target_value}
      sparklineData={sparklineData}
      onClick={onClick}
    />
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: northStarMetrics, isLoading: nsLoading } = useNorthStarMetrics();
  const { data: allMetrics, isLoading: allLoading } = useMetrics();
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null);

  const secondaryMetrics = allMetrics?.filter((m) => !m.is_north_star) ?? [];
  const expandedMetric = allMetrics?.find((m) => m.id === expandedMetricId);

  const isLoading = nsLoading || allLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <FilterBar />
      </div>

      {/* North Star Metrics */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : northStarMetrics && northStarMetrics.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {northStarMetrics.map((metric) => (
            <MetricCardWithData
              key={metric.id}
              metric={metric}
              isNorthStar
              onClick={() =>
                setExpandedMetricId(expandedMetricId === metric.id ? null : metric.id)
              }
            />
          ))}
        </div>
      ) : null}

      {/* Expanded Chart */}
      {expandedMetric && <ExpandedChart metric={expandedMetric} />}

      {/* Secondary Metrics */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : secondaryMetrics.length > 0 ? (
        <>
          <h2 className="text-lg font-semibold text-gray-700">Métricas Secundárias</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {secondaryMetrics.map((metric) => (
              <MetricCardWithData
                key={metric.id}
                metric={metric}
                isNorthStar={false}
                onClick={() => navigate(`/dashboard/metrics/${metric.id}`)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma métrica configurada"
          description="Adicione métricas em Configurações para acompanhar seus KPIs."
          actionLabel="Ir para Configurações"
          onAction={() => navigate("/settings")}
        />
      )}
    </div>
  );
}

function ExpandedChart({ metric }: { metric: Metric }) {
  const { data: snapshots = [] } = useMetricSnapshots(metric.id);

  return (
    <MetricDetailChart
      title={metric.name}
      snapshots={snapshots}
      unit={metric.unit}
      targetValue={metric.target_value}
    />
  );
}
```

- [ ] **Step 3: Update App.tsx to use DashboardPage**

In `src/App.tsx`, replace the `DashboardPlaceholder` function and its route:

Replace:
```tsx
function DashboardPlaceholder() {
  return <div className="text-lg text-gray-500">Dashboard — coming next</div>;
}
```

With the import at the top:
```tsx
import { DashboardPage } from "@/pages/dashboard";
```

And update the route from:
```tsx
<Route path="/dashboard" element={<DashboardPlaceholder />} />
```

To:
```tsx
<Route path="/dashboard" element={<DashboardPage />} />
```

Remove the `DashboardPlaceholder` function entirely.

- [ ] **Step 4: Verify dev server shows dashboard**

```bash
npm run dev
```

Navigate to `/dashboard` — should render filter bar, skeleton loading states (or empty state if no Supabase configured yet), and proper layout.

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard.tsx src/components/metrics/metric-detail-chart.tsx src/App.tsx
git commit -m "feat: add Dashboard page with north star cards, secondary metrics grid, and expandable charts"
```

---

## Task 13: Metric Detail Page

**Files:**
- Create: `src/pages/metric-detail.tsx`, `src/components/metrics/snapshot-table.tsx`
- Modify: `src/App.tsx` (add route)

- [ ] **Step 1: Implement SnapshotTable**

Create `src/components/metrics/snapshot-table.tsx`:

```tsx
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatNumber } from "@/lib/utils";
import type { MetricSnapshot } from "@/types/database";

interface SnapshotTableProps {
  snapshots: MetricSnapshot[];
  unit: string;
}

export function SnapshotTable({ snapshots, unit }: SnapshotTableProps) {
  return (
    <div className="overflow-x-auto rounded-card border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Fonte</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot.id} className="border-b last:border-0">
              <td className="px-4 py-3 text-gray-900">
                {format(new Date(snapshot.period_start), "dd MMM yyyy", { locale: ptBR })}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">
                {formatNumber(snapshot.value, unit)}
              </td>
              <td className="px-4 py-3 text-gray-500 capitalize">{snapshot.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Install date-fns**

```bash
npm install date-fns
```

- [ ] **Step 3: Implement MetricDetailPage**

Create `src/pages/metric-detail.tsx`:

```tsx
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useMetric } from "@/hooks/use-metrics";
import { useMetricSnapshots, snapshotsToSparkline } from "@/hooks/use-metric-snapshots";
import { MetricDetailChart } from "@/components/metrics/metric-detail-chart";
import { SnapshotTable } from "@/components/metrics/snapshot-table";
import { FilterBar } from "@/components/metrics/filter-bar";
import { ChartSkeleton, CardSkeleton } from "@/components/shared/loading-skeleton";
import { formatNumber, calculateVariation } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MetricDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: metric, isLoading: metricLoading } = useMetric(id);
  const { data: snapshots = [], isLoading: snapshotsLoading } = useMetricSnapshots(id);

  const isLoading = metricLoading || snapshotsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!metric) {
    return <div>Métrica não encontrada</div>;
  }

  const previousValue = snapshots.length >= 2 ? snapshots[snapshots.length - 2].value : null;
  const variation = previousValue !== null ? calculateVariation(metric.current_value, previousValue) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-primary">{metric.name}</h1>
      </div>

      <FilterBar />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <MetricDetailChart
            title={metric.name}
            snapshots={snapshots}
            unit={metric.unit}
            targetValue={metric.target_value}
          />
        </div>

        <Card className="rounded-card shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm text-gray-500">Valor Atual</p>
              <p className="text-2xl font-bold">{formatNumber(metric.current_value, metric.unit)}</p>
            </div>
            {metric.target_value !== null && (
              <div>
                <p className="text-sm text-gray-500">Meta</p>
                <p className="text-lg font-semibold">{formatNumber(metric.target_value, metric.unit)}</p>
              </div>
            )}
            {variation !== null && (
              <div>
                <p className="text-sm text-gray-500">Variação</p>
                <p className={`text-lg font-semibold ${variation >= 0 ? "text-status-green" : "text-status-red"}`}>
                  {variation >= 0 ? "+" : ""}{variation.toFixed(1)}%
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Fonte</p>
              <p className="text-sm font-medium capitalize">{metric.source}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Frequência</p>
              <p className="text-sm font-medium capitalize">{metric.frequency}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <SnapshotTable snapshots={[...snapshots].reverse()} unit={metric.unit} />
    </div>
  );
}
```

- [ ] **Step 4: Add route to App.tsx**

Add import at top of `src/App.tsx`:
```tsx
import { MetricDetailPage } from "@/pages/metric-detail";
```

Add route inside the private route group, after the dashboard route:
```tsx
<Route path="/dashboard/metrics/:id" element={<MetricDetailPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/metric-detail.tsx src/components/metrics/snapshot-table.tsx src/App.tsx
git commit -m "feat: add metric detail page with area chart and snapshot table"
```

---

## Task 14: OKR Data Hooks

**Files:**
- Create: `src/hooks/use-objectives.ts`, `src/hooks/use-key-results.ts`, `src/hooks/use-check-ins.ts`

- [ ] **Step 1: Implement objectives hook**

Create `src/hooks/use-objectives.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import type { Objective, KeyResult } from "@/types/database";

export interface ObjectiveWithKRs extends Objective {
  key_results: KeyResult[];
}

export function useObjectives(filters?: { period?: string; level?: string; status?: string }) {
  const workspace = useAuthStore((s) => s.workspace);

  return useQuery<ObjectiveWithKRs[]>({
    queryKey: ["objectives", workspace?.id, filters],
    queryFn: async () => {
      if (!workspace) return [];
      let query = supabase
        .from("objectives")
        .select("*, key_results(*)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });

      if (filters?.period) {
        query = query.eq("period", filters.period);
      }
      if (filters?.level) {
        query = query.eq("level", filters.level);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as ObjectiveWithKRs[]) ?? [];
    },
    enabled: !!workspace,
  });
}

export function useObjective(id: string | undefined) {
  return useQuery<ObjectiveWithKRs | null>({
    queryKey: ["objective", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("objectives")
        .select("*, key_results(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ObjectiveWithKRs;
    },
    enabled: !!id,
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();
  const workspace = useAuthStore((s) => s.workspace);

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      period: string;
      level: string;
      parent_id?: string | null;
      key_results: Array<{
        title: string;
        kr_type: string;
        target_value: number;
        baseline_value: number;
        unit: string;
        weight: number;
        linked_metric_id?: string | null;
      }>;
    }) => {
      if (!workspace) throw new Error("No workspace");

      const { data: objective, error: objError } = await supabase
        .from("objectives")
        .insert({
          workspace_id: workspace.id,
          title: data.title,
          description: data.description ?? null,
          period: data.period,
          level: data.level,
          parent_id: data.parent_id ?? null,
        })
        .select()
        .single();

      if (objError) throw objError;

      if (data.key_results.length > 0) {
        const krs = data.key_results.map((kr, index) => ({
          objective_id: objective.id,
          title: kr.title,
          kr_type: kr.kr_type,
          target_value: kr.target_value,
          baseline_value: kr.baseline_value,
          unit: kr.unit,
          weight: kr.weight,
          linked_metric_id: kr.linked_metric_id ?? null,
          is_auto_tracked: !!kr.linked_metric_id,
          display_order: index + 1,
        }));

        const { error: krError } = await supabase.from("key_results").insert(krs);
        if (krError) throw krError;
      }

      return objective;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
    },
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("objectives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
    },
  });
}
```

- [ ] **Step 2: Implement key results hook**

Create `src/hooks/use-key-results.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getStatusFromProgress, calculateProgress } from "@/lib/utils";

export function useUpdateKeyResultValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ krId, value, objectiveId }: { krId: string; value: number; objectiveId: string }) => {
      // Update the KR
      const { error } = await supabase
        .from("key_results")
        .update({ current_value: value })
        .eq("id", krId);

      if (error) throw error;

      // Recalculate objective progress
      const { data: krs } = await supabase
        .from("key_results")
        .select("*")
        .eq("objective_id", objectiveId);

      if (krs && krs.length > 0) {
        const totalWeight = krs.reduce((sum, kr) => sum + kr.weight, 0);
        const weightedProgress = krs.reduce((sum, kr) => {
          const progress = calculateProgress(kr.current_value, kr.baseline_value, kr.target_value);
          return sum + progress * kr.weight;
        }, 0);

        const overallProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
        const status = getStatusFromProgress(overallProgress);

        await supabase
          .from("objectives")
          .update({ progress: Math.round(overallProgress), status })
          .eq("id", objectiveId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objective"] });
    },
  });
}
```

- [ ] **Step 3: Implement check-ins hook**

Create `src/hooks/use-check-ins.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import type { CheckIn } from "@/types/database";

export function useCheckIns(keyResultId: string | undefined) {
  return useQuery<CheckIn[]>({
    queryKey: ["check-ins", keyResultId],
    queryFn: async () => {
      if (!keyResultId) return [];
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("key_result_id", keyResultId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!keyResultId,
  });
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (data: {
      key_result_id: string;
      value: number;
      confidence: number;
      note?: string;
      objective_id: string;
    }) => {
      // Create check-in
      const { error: ciError } = await supabase.from("check_ins").insert({
        key_result_id: data.key_result_id,
        value: data.value,
        confidence: data.confidence,
        note: data.note ?? null,
        created_by: user?.id ?? null,
      });

      if (ciError) throw ciError;

      // Update KR current_value
      const { error: krError } = await supabase
        .from("key_results")
        .update({ current_value: data.value })
        .eq("id", data.key_result_id);

      if (krError) throw krError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objective"] });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-objectives.ts src/hooks/use-key-results.ts src/hooks/use-check-ins.ts
git commit -m "feat: add OKR data hooks (objectives, key results, check-ins)"
```

---

## Task 15: OKR Components (OKRCard, KRProgressRow, ConfidenceSlider, CheckInModal, CheckInTimeline)

**Files:**
- Create: `src/components/okrs/confidence-slider.tsx`, `src/components/okrs/kr-progress-row.tsx`, `src/components/okrs/okr-card.tsx`, `src/components/okrs/check-in-modal.tsx`, `src/components/okrs/check-in-timeline.tsx`
- Test: `tests/components/confidence-slider.test.tsx`, `tests/components/okr-card.test.tsx`

- [ ] **Step 1: Write ConfidenceSlider test**

Create `tests/components/confidence-slider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { ConfidenceSlider } from "@/components/okrs/confidence-slider";

describe("ConfidenceSlider", () => {
  it("renders all 5 emoji buttons", () => {
    render(<ConfidenceSlider value={3} onChange={vi.fn()} />);
    expect(screen.getByText("😰")).toBeInTheDocument();
    expect(screen.getByText("😕")).toBeInTheDocument();
    expect(screen.getByText("😐")).toBeInTheDocument();
    expect(screen.getByText("🙂")).toBeInTheDocument();
    expect(screen.getByText("🤩")).toBeInTheDocument();
  });

  it("calls onChange when clicked", async () => {
    const onChange = vi.fn();
    render(<ConfidenceSlider value={3} onChange={onChange} />);
    await userEvent.click(screen.getByText("🤩"));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("highlights active emoji", () => {
    const { container } = render(<ConfidenceSlider value={4} onChange={vi.fn()} />);
    const buttons = container.querySelectorAll("button");
    // 4th button (index 3) should have active styling
    expect(buttons[3].className).toContain("ring-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/confidence-slider.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement ConfidenceSlider**

Create `src/components/okrs/confidence-slider.tsx`:

```tsx
import { CONFIDENCE_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  return (
    <div className="flex items-center gap-2">
      {CONFIDENCE_EMOJIS.map((emoji, index) => {
        const level = index + 1;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all hover:scale-110",
              value === level
                ? "ring-2 ring-accent ring-offset-2 scale-110"
                : "opacity-50 hover:opacity-80"
            )}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/confidence-slider.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 5: Implement KRProgressRow**

Create `src/components/okrs/kr-progress-row.tsx`:

```tsx
import { Link } from "react-router-dom";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateProgress, formatNumber } from "@/lib/utils";
import { CONFIDENCE_EMOJIS } from "@/lib/constants";
import type { KeyResult } from "@/types/database";

interface KRProgressRowProps {
  kr: KeyResult;
  latestConfidence?: number;
  onCheckIn?: () => void;
}

export function KRProgressRow({ kr, latestConfidence, onCheckIn }: KRProgressRowProps) {
  const progress = calculateProgress(kr.current_value, kr.baseline_value, kr.target_value);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{kr.title}</span>
          {kr.is_auto_tracked && (
            <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
              Auto
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span>{formatNumber(kr.current_value, kr.unit)} / {formatNumber(kr.target_value, kr.unit)}</span>
          {latestConfidence && (
            <span>{CONFIDENCE_EMOJIS[latestConfidence - 1]}</span>
          )}
        </div>
        <ProgressBar value={progress} className="mt-2" showLabel />
      </div>

      {!kr.is_auto_tracked && onCheckIn && (
        <Button variant="outline" size="sm" onClick={onCheckIn} className="shrink-0">
          Check-in
        </Button>
      )}

      {kr.is_auto_tracked && kr.linked_metric_id && (
        <Button variant="ghost" size="sm" asChild className="shrink-0 text-accent">
          <Link to={`/dashboard/metrics/${kr.linked_metric_id}`}>
            Ver métrica
          </Link>
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implement CheckInModal**

Create `src/components/okrs/check-in-modal.tsx`:

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfidenceSlider } from "./confidence-slider";
import { useCreateCheckIn } from "@/hooks/use-check-ins";
import { useUpdateKeyResultValue } from "@/hooks/use-key-results";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { KeyResult } from "@/types/database";

const checkInSchema = z.object({
  value: z.number({ required_error: "Valor obrigatório" }),
  note: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResult: KeyResult;
  objectiveId: string;
}

export function CheckInModal({ open, onOpenChange, keyResult, objectiveId }: CheckInModalProps) {
  const [confidence, setConfidence] = useState(3);
  const createCheckIn = useCreateCheckIn();
  const updateKR = useUpdateKeyResultValue();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { value: keyResult.current_value },
  });

  async function onSubmit(data: CheckInFormData) {
    try {
      await createCheckIn.mutateAsync({
        key_result_id: keyResult.id,
        value: data.value,
        confidence,
        note: data.note,
        objective_id: objectiveId,
      });

      await updateKR.mutateAsync({
        krId: keyResult.id,
        value: data.value,
        objectiveId,
      });

      toast.success("Check-in salvo!");
      reset();
      setConfidence(3);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar check-in.");
    }
  }

  const isSubmitting = createCheckIn.isPending || updateKR.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check-in</DialogTitle>
        </DialogHeader>

        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-700">{keyResult.title}</p>
          <p className="text-xs text-gray-500">
            Atual: {keyResult.current_value} · Meta: {keyResult.target_value} {keyResult.unit}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value">
              Valor Atual {keyResult.unit && `(${keyResult.unit})`}
            </Label>
            <Input
              id="value"
              type="number"
              step="any"
              {...register("value", { valueAsNumber: true })}
              className="rounded-input"
            />
            {errors.value && (
              <p className="text-xs text-status-red">{errors.value.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Confiança</Label>
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Textarea
              id="note"
              {...register("note")}
              placeholder="Como estão as coisas?"
              className="rounded-input"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Implement CheckInTimeline**

Create `src/components/okrs/check-in-timeline.tsx`:

```tsx
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CONFIDENCE_EMOJIS } from "@/lib/constants";
import type { CheckIn } from "@/types/database";

interface CheckInTimelineProps {
  checkIns: CheckIn[];
  unit: string;
}

export function CheckInTimeline({ checkIns, unit }: CheckInTimelineProps) {
  if (checkIns.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum check-in ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {checkIns.map((ci) => (
        <div key={ci.id} className="flex gap-3 border-l-2 border-gray-200 pl-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {ci.value} {unit}
              </span>
              <span className="text-lg">{CONFIDENCE_EMOJIS[ci.confidence - 1]}</span>
              <span className="text-xs text-gray-400">
                {format(new Date(ci.created_at), "dd MMM yyyy", { locale: ptBR })}
              </span>
            </div>
            {ci.note && (
              <p className="mt-0.5 text-sm text-gray-600">{ci.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Implement OKRCard**

Create `src/components/okrs/okr-card.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { KRProgressRow } from "./kr-progress-row";
import { CheckInModal } from "./check-in-modal";
import { LEVEL_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ObjectiveWithKRs } from "@/hooks/use-objectives";
import type { KeyResult } from "@/types/database";

interface OKRCardProps {
  objective: ObjectiveWithKRs;
}

export function OKRCard({ objective }: OKRCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [checkInKR, setCheckInKR] = useState<KeyResult | null>(null);

  return (
    <>
      <Card className="rounded-card shadow-sm">
        <CardContent className="p-5">
          {/* Header */}
          <div
            className="flex cursor-pointer items-start justify-between gap-4"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                )}
                <h3 className="font-semibold text-gray-900 truncate">{objective.title}</h3>
              </div>
              <div className="mt-1 ml-6 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{objective.period}</span>
                <span>·</span>
                <span>{LEVEL_LABELS[objective.level]}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusBadge status={objective.status} />
              <span className="text-sm font-bold text-gray-700 tabular-nums">
                {Math.round(objective.progress)}%
              </span>
            </div>
          </div>

          <ProgressBar value={objective.progress} className="mt-3 ml-6" />

          {/* Expanded KRs */}
          {expanded && (
            <div className="mt-4 ml-6 space-y-2">
              {objective.key_results
                .sort((a, b) => a.display_order - b.display_order)
                .map((kr) => (
                  <KRProgressRow
                    key={kr.id}
                    kr={kr}
                    onCheckIn={() => setCheckInKR(kr)}
                  />
                ))}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/okrs/${objective.id}`)}
                >
                  Ver detalhes
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {checkInKR && (
        <CheckInModal
          open={!!checkInKR}
          onOpenChange={(open) => !open && setCheckInKR(null)}
          keyResult={checkInKR}
          objectiveId={objective.id}
        />
      )}
    </>
  );
}
```

- [ ] **Step 9: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/okrs/ tests/components/confidence-slider.test.tsx
git commit -m "feat: add OKR components (OKRCard, KRProgressRow, ConfidenceSlider, CheckInModal, CheckInTimeline)"
```

---

## Task 16: OKR Pages (Listing, Detail, New)

**Files:**
- Create: `src/pages/okrs.tsx`, `src/pages/okr-detail.tsx`, `src/pages/okr-new.tsx`, `src/components/okrs/okr-form.tsx`
- Modify: `src/App.tsx` (add routes)

- [ ] **Step 1: Implement OKR form**

Create `src/components/okrs/okr-form.tsx`:

```tsx
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KR_TYPES, LEVEL_LABELS } from "@/lib/constants";
import { useMetrics } from "@/hooks/use-metrics";
import { Loader2 } from "lucide-react";

const krSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  kr_type: z.string(),
  target_value: z.number({ required_error: "Meta obrigatória" }),
  baseline_value: z.number().default(0),
  unit: z.string().default(""),
  weight: z.number().min(1).default(1),
  linked_metric_id: z.string().nullable().default(null),
});

const objectiveSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  period: z.string().min(1, "Período obrigatório"),
  level: z.string().min(1, "Nível obrigatório"),
  parent_id: z.string().nullable().default(null),
  key_results: z.array(krSchema).min(1, "Pelo menos 1 Key Result"),
});

export type OKRFormData = z.infer<typeof objectiveSchema>;

interface OKRFormProps {
  onSubmit: (data: OKRFormData) => Promise<void>;
  isSubmitting: boolean;
}

const currentYear = new Date().getFullYear();
const PERIODS = [
  `Q1 ${currentYear}`, `Q2 ${currentYear}`, `Q3 ${currentYear}`, `Q4 ${currentYear}`,
  `Q1 ${currentYear + 1}`, `Q2 ${currentYear + 1}`,
];

export function OKRForm({ onSubmit, isSubmitting }: OKRFormProps) {
  const { data: metrics = [] } = useMetrics();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OKRFormData>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: "",
      description: "",
      period: `Q2 ${currentYear}`,
      level: "team",
      parent_id: null,
      key_results: [
        { title: "", kr_type: "number", target_value: 0, baseline_value: 0, unit: "", weight: 1, linked_metric_id: null },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "key_results" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Objective fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título do Objective</Label>
          <Input id="title" {...register("title")} placeholder="Ex: Aumentar satisfação do cliente" className="rounded-input" />
          {errors.title && <p className="text-xs text-status-red">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea id="description" {...register("description")} placeholder="Contexto adicional..." className="rounded-input" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={watch("period")} onValueChange={(v) => setValue("period", v)}>
              <SelectTrigger className="rounded-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={watch("level")} onValueChange={(v) => setValue("level", v)}>
              <SelectTrigger className="rounded-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Key Results</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ title: "", kr_type: "number", target_value: 0, baseline_value: 0, unit: "", weight: 1, linked_metric_id: null })}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar KR
          </Button>
        </div>

        {errors.key_results?.root && (
          <p className="text-xs text-status-red">{errors.key_results.root.message}</p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="space-y-3 rounded-card border bg-gray-50/50 p-4">
            <div className="flex items-start justify-between">
              <Label className="text-sm font-medium text-gray-600">KR {index + 1}</Label>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-status-red" />
                </Button>
              )}
            </div>

            <Input {...register(`key_results.${index}.title`)} placeholder="Título do Key Result" className="rounded-input" />
            {errors.key_results?.[index]?.title && (
              <p className="text-xs text-status-red">{errors.key_results[index].title?.message}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={watch(`key_results.${index}.kr_type`)} onValueChange={(v) => setValue(`key_results.${index}.kr_type`, v)}>
                  <SelectTrigger className="rounded-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Baseline</Label>
                <Input type="number" step="any" {...register(`key_results.${index}.baseline_value`, { valueAsNumber: true })} className="rounded-input" />
              </div>
              <div>
                <Label className="text-xs">Meta</Label>
                <Input type="number" step="any" {...register(`key_results.${index}.target_value`, { valueAsNumber: true })} className="rounded-input" />
              </div>
              <div>
                <Label className="text-xs">Peso</Label>
                <Input type="number" min="1" {...register(`key_results.${index}.weight`, { valueAsNumber: true })} className="rounded-input" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Vincular a Métrica (opcional)</Label>
              <Select
                value={watch(`key_results.${index}.linked_metric_id`) ?? "none"}
                onValueChange={(v) => setValue(`key_results.${index}.linked_metric_id`, v === "none" ? null : v)}
              >
                <SelectTrigger className="rounded-input"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (check-in manual)</SelectItem>
                  {metrics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar OKR"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Implement OKRs listing page**

Create `src/pages/okrs.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OKRCard } from "@/components/okrs/okr-card";
import { ListSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useObjectives } from "@/hooks/use-objectives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OKRsPage() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const filters = {
    level: level === "all" ? undefined : level,
    status: status === "all" ? undefined : status,
  };

  const { data: objectives, isLoading } = useObjectives(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">OKRs</h1>
        <Button onClick={() => navigate("/okrs/new")} className="bg-accent hover:bg-accent/90">
          <Plus className="mr-1 h-4 w-4" /> Novo OKR
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={level} onValueChange={setLevel}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="team">Time</TabsTrigger>
            <TabsTrigger value="individual">Individual</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 rounded-input">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="on_track">No Caminho</SelectItem>
            <SelectItem value="at_risk">Em Risco</SelectItem>
            <SelectItem value="off_track">Fora do Caminho</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : objectives && objectives.length > 0 ? (
        <div className="space-y-4">
          {objectives.map((objective) => (
            <OKRCard key={objective.id} objective={objective} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="Nenhum OKR encontrado"
          description="Crie seu primeiro OKR para começar a acompanhar seus objetivos."
          actionLabel="Criar OKR"
          onAction={() => navigate("/okrs/new")}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement OKR detail page**

Create `src/pages/okr-detail.tsx`:

```tsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useObjective, useDeleteObjective } from "@/hooks/use-objectives";
import { useCheckIns } from "@/hooks/use-check-ins";
import { KRProgressRow } from "@/components/okrs/kr-progress-row";
import { CheckInModal } from "@/components/okrs/check-in-modal";
import { CheckInTimeline } from "@/components/okrs/check-in-timeline";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ListSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { KeyResult } from "@/types/database";

export function OKRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: objective, isLoading } = useObjective(id);
  const deleteObjective = useDeleteObjective();
  const [checkInKR, setCheckInKR] = useState<KeyResult | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedKRId, setSelectedKRId] = useState<string | null>(null);

  // Load check-ins for selected KR
  const { data: checkIns = [] } = useCheckIns(selectedKRId ?? undefined);

  if (isLoading) return <ListSkeleton count={2} />;
  if (!objective) return <div>OKR não encontrado</div>;

  async function handleDelete() {
    try {
      await deleteObjective.mutateAsync(objective!.id);
      toast.success("OKR removido.");
      navigate("/okrs");
    } catch {
      toast.error("Erro ao remover OKR.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/okrs"><ArrowLeft className="mr-1 h-4 w-4" />OKRs</Link>
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-status-red">
          <Trash2 className="mr-1 h-4 w-4" /> Remover
        </Button>
      </div>

      {/* Summary card */}
      <Card className="rounded-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{objective.title}</h1>
              {objective.description && (
                <p className="mt-1 text-sm text-gray-600">{objective.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <span>{objective.period}</span>
                <span>·</span>
                <span>{LEVEL_LABELS[objective.level]}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={objective.status} />
              <span className="text-2xl font-bold text-gray-700">{Math.round(objective.progress)}%</span>
            </div>
          </div>
          <ProgressBar value={objective.progress} className="mt-4" showLabel />
        </CardContent>
      </Card>

      {/* Key Results */}
      <Card className="rounded-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Key Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {objective.key_results
            .sort((a, b) => a.display_order - b.display_order)
            .map((kr) => (
              <div key={kr.id}>
                <KRProgressRow
                  kr={kr}
                  onCheckIn={() => setCheckInKR(kr)}
                />
                <Button
                  variant="link"
                  size="sm"
                  className="ml-3 mt-1 text-xs text-gray-400"
                  onClick={() => setSelectedKRId(selectedKRId === kr.id ? null : kr.id)}
                >
                  {selectedKRId === kr.id ? "Ocultar histórico" : "Ver histórico"}
                </Button>
                {selectedKRId === kr.id && (
                  <div className="ml-6 mt-2 mb-4">
                    <CheckInTimeline checkIns={checkIns} unit={kr.unit} />
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      {checkInKR && (
        <CheckInModal
          open={!!checkInKR}
          onOpenChange={(open) => !open && setCheckInKR(null)}
          keyResult={checkInKR}
          objectiveId={objective.id}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remover OKR"
        description="Tem certeza? Isso vai remover o OKR e todos os Key Results e check-ins associados. Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 4: Implement New OKR page**

Create `src/pages/okr-new.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OKRForm, type OKRFormData } from "@/components/okrs/okr-form";
import { useCreateObjective } from "@/hooks/use-objectives";
import { toast } from "sonner";

export function OKRNewPage() {
  const navigate = useNavigate();
  const createObjective = useCreateObjective();

  async function handleSubmit(data: OKRFormData) {
    try {
      const objective = await createObjective.mutateAsync(data);
      toast.success("OKR criado!");
      navigate(`/okrs/${objective.id}`);
    } catch {
      toast.error("Erro ao criar OKR.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/okrs")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> OKRs
        </Button>
        <h1 className="text-2xl font-bold text-primary">Novo OKR</h1>
      </div>

      <Card className="rounded-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Criar Objective</CardTitle>
        </CardHeader>
        <CardContent>
          <OKRForm onSubmit={handleSubmit} isSubmitting={createObjective.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Update App.tsx with all routes**

Replace `src/App.tsx` fully:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { PrivateRoute } from "@/components/layout/private-route";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { MetricDetailPage } from "@/pages/metric-detail";
import { OKRsPage } from "@/pages/okrs";
import { OKRDetailPage } from "@/pages/okr-detail";
import { OKRNewPage } from "@/pages/okr-new";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AppRoutes() {
  useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/metrics/:id" element={<MetricDetailPage />} />
        <Route path="/okrs" element={<OKRsPage />} />
        <Route path="/okrs/new" element={<OKRNewPage />} />
        <Route path="/okrs/:id" element={<OKRDetailPage />} />
        <Route path="/settings" element={<SettingsPlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function SettingsPlaceholder() {
  return <div className="text-lg text-gray-500">Configurações — em breve</div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Run all tests and build**

```bash
npx vitest run
npm run build
```

Expected: All tests PASS, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ src/components/okrs/okr-form.tsx src/App.tsx
git commit -m "feat: add OKR pages (listing, detail, create) with full CRUD"
```

---

## Task 17: Settings Page (Profile, Data Sources, Metrics CRUD)

**Files:**
- Create: `src/pages/settings.tsx`
- Modify: `src/App.tsx` (replace placeholder)

- [ ] **Step 1: Implement Settings page**

Create `src/pages/settings.tsx`:

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { METRIC_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { Plus, Trash2, Settings2, BarChart3, Database, Loader2 } from "lucide-react";
import type { Metric, DataSource } from "@/types/database";

const metricSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  category: z.string(),
  unit: z.string().default(""),
  frequency: z.string().default("weekly"),
  target_value: z.number().nullable().default(null),
  source: z.string().default("manual"),
  is_north_star: z.boolean().default(false),
});

type MetricFormData = z.infer<typeof metricSchema>;

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Configurações</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="datasources">Data Sources</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="datasources" className="mt-6">
          <DataSourcesTab />
        </TabsContent>
        <TabsContent value="metrics" className="mt-6">
          <MetricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();

  return (
    <Card className="rounded-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Email</Label>
          <p className="text-sm text-gray-700">{user?.email ?? "—"}</p>
        </div>
        <div>
          <Label>ID</Label>
          <p className="text-xs text-gray-400 font-mono">{user?.id ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DataSourcesTab() {
  const workspace = useAuthStore((s) => s.workspace);

  const { data: sources = [], isLoading } = useQuery<DataSource[]>({
    queryKey: ["data-sources", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspace,
  });

  if (isLoading) return <p className="text-sm text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-4">
      {sources.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Nenhuma fonte de dados"
          description="Configure BigQuery ou Survicate para importar métricas automaticamente."
        />
      ) : (
        sources.map((source) => (
          <Card key={source.id} className="rounded-card shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{source.name}</p>
                <p className="text-xs text-gray-500 capitalize">{source.type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={source.is_active ? "default" : "secondary"}>
                  {source.is_active ? "Ativo" : "Inativo"}
                </Badge>
                {source.last_sync && (
                  <span className="text-xs text-gray-400">
                    Último sync: {new Date(source.last_sync).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function MetricsTab() {
  const workspace = useAuthStore((s) => s.workspace);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: metrics = [], isLoading } = useQuery<Metric[]>({
    queryKey: ["settings-metrics", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspace,
  });

  const createMetric = useMutation({
    mutationFn: async (data: MetricFormData) => {
      if (!workspace) throw new Error("No workspace");
      const { error } = await supabase.from("metrics").insert({
        workspace_id: workspace.id,
        ...data,
        target_value: data.target_value,
        display_order: metrics.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      setShowForm(false);
      toast.success("Métrica criada!");
    },
  });

  const deleteMetric = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      setDeleteId(null);
      toast.success("Métrica removida.");
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<MetricFormData>({
    resolver: zodResolver(metricSchema),
    defaultValues: { name: "", category: "satisfaction", source: "manual", frequency: "weekly", is_north_star: false },
  });

  async function onSubmit(data: MetricFormData) {
    await createMetric.mutateAsync(data);
    reset();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{metrics.length} métricas configuradas</p>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Nova Métrica
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-card shadow-sm border-accent/30">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input {...register("name")} placeholder="Ex: NPS" className="rounded-input" />
                  {errors.name && <p className="text-xs text-status-red">{errors.name.message}</p>}
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                    <SelectTrigger className="rounded-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METRIC_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Unidade</Label>
                  <Input {...register("unit")} placeholder="%, BRL, h..." className="rounded-input" />
                </div>
                <div>
                  <Label className="text-xs">Meta</Label>
                  <Input type="number" step="any" {...register("target_value", { valueAsNumber: true })} className="rounded-input" />
                </div>
                <div>
                  <Label className="text-xs">Fonte</Label>
                  <Select value={watch("source")} onValueChange={(v) => setValue("source", v)}>
                    <SelectTrigger className="rounded-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="bigquery">BigQuery</SelectItem>
                      <SelectItem value="survicate">Survicate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={watch("is_north_star")}
                  onCheckedChange={(v) => setValue("is_north_star", v)}
                />
                <Label className="text-xs">Métrica Norte (destaque no dashboard)</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); reset(); }}>Cancelar</Button>
                <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90" disabled={createMetric.isPending}>
                  {createMetric.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {metrics.map((metric) => (
        <Card key={metric.id} className="rounded-card shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{metric.name}</p>
                  {metric.is_north_star && (
                    <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">Norte</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 capitalize">{metric.source} · {metric.frequency} · {metric.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {metric.target_value !== null && (
                <span className="text-xs text-gray-400">Meta: {metric.target_value}{metric.unit}</span>
              )}
              <Button variant="ghost" size="sm" onClick={() => setDeleteId(metric.id)}>
                <Trash2 className="h-4 w-4 text-status-red" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remover Métrica"
        description="Tem certeza? Isso vai remover a métrica e todos os seus snapshots."
        confirmLabel="Remover"
        onConfirm={() => deleteId && deleteMetric.mutate(deleteId)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Install switch component**

```bash
npx shadcn@latest add switch
```

- [ ] **Step 3: Update App.tsx — replace SettingsPlaceholder**

In `src/App.tsx`, add import:
```tsx
import { SettingsPage } from "@/pages/settings";
```

Replace:
```tsx
<Route path="/settings" element={<SettingsPlaceholder />} />
```

With:
```tsx
<Route path="/settings" element={<SettingsPage />} />
```

Remove the `SettingsPlaceholder` function entirely.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings.tsx src/App.tsx
git commit -m "feat: add Settings page with profile, data sources, and metrics CRUD"
```

---

## Task 18: Final Integration Test + Polish

**Files:**
- Modify: `src/index.css` (add Inter font), `index.html` (add font link)

- [ ] **Step 1: Add Inter font to index.html**

In `index.html`, add inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<title>ProductOS</title>
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Verify dev server**

```bash
npm run dev
```

Manual verification checklist:
- [ ] `/login` renders login form with ProductOS branding
- [ ] Sidebar navigation works (Dashboard, OKRs, Settings)
- [ ] Sidebar collapses and persists state
- [ ] Dashboard shows empty state or metrics cards
- [ ] OKRs page shows empty state with "Criar OKR" CTA
- [ ] New OKR form renders with KR fields
- [ ] Settings page has 3 tabs (Profile, Data Sources, Metrics)
- [ ] Responsive: sidebar auto-collapses on mobile

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: add Inter font, finalize ProductOS MVP build"
```

---

## Summary

| Task | Description | Est. Time |
|------|------------|-----------|
| 1 | Project scaffold + tooling | 10 min |
| 2 | Supabase client + types | 5 min |
| 3 | Database migration + seed | 10 min |
| 4 | Auth store + hook | 5 min |
| 5 | Sidebar + Header + Layout | 10 min |
| 6 | Router + Login + App entry | 10 min |
| 7 | Shared UI components | 15 min |
| 8 | SparklineChart | 5 min |
| 9 | Filter store + FilterBar | 10 min |
| 10 | MetricCard + NorthStarCard | 10 min |
| 11 | Metrics data hooks | 10 min |
| 12 | Dashboard page | 10 min |
| 13 | Metric detail page | 10 min |
| 14 | OKR data hooks | 10 min |
| 15 | OKR components | 15 min |
| 16 | OKR pages | 15 min |
| 17 | Settings page | 10 min |
| 18 | Final integration + polish | 10 min |
| **Total** | | **~2.5 hours** |
