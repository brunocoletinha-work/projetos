# BigQuery Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 3 Supabase Edge Functions that query BigQuery (`dw-onfly-prd`) and return JSON for travel compliance data: violations over time, approval time by manager, and auto-approval suggestions.

**Architecture:** Each Edge Function authenticates with BigQuery via a Service Account JWT, runs a parameterized query, and returns JSON. A shared `_shared/bigquery.ts` module handles authentication and query execution used by all three functions.

**Tech Stack:** Supabase Edge Functions (Deno), BigQuery REST API, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/functions/_shared/bigquery.ts` | Create | JWT auth + `runQuery()` helper |
| `supabase/functions/infracoes-por-tempo/index.ts` | Create | Endpoint 1: violations over time |
| `supabase/functions/tempo-aprovacao-gestor/index.ts` | Create | Endpoint 2: approval time by manager |
| `supabase/functions/auto-aprovacao-sugestao/index.ts` | Create | Endpoint 3: auto-approval suggestions |

---

## Task 1: BigQuery Auth Shared Module

**Files:**
- Create: `supabase/functions/_shared/bigquery.ts`

- [ ] **Step 1: Create the shared bigquery.ts module**

Create `supabase/functions/_shared/bigquery.ts` with the full contents:

```typescript
export interface QueryParameter {
  name: string;
  parameterType: { type: string };
  parameterValue: { value: string };
}

export interface BigQueryRow {
  f: { v: string | null }[];
}

export interface BigQueryResult {
  schema: { fields: { name: string; type: string }[] };
  rows: BigQueryRow[];
  jobComplete: boolean;
}

async function getAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  const pemKey = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${encodedSignature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

export async function runQuery(
  sql: string,
  parameters: QueryParameter[] = [],
  timeoutMs = 30000
): Promise<Record<string, unknown>[]> {
  const raw = Deno.env.get("BIGQUERY_SERVICE_ACCOUNT");
  if (!raw) throw new Error("BIGQUERY_SERVICE_ACCOUNT env var not set");

  const serviceAccount = JSON.parse(raw);
  const token = await getAccessToken(serviceAccount);

  const projectId = serviceAccount.project_id ?? "dw-onfly-prd";

  const body: Record<string, unknown> = {
    query: sql,
    useLegacySql: false,
    timeoutMs,
  };

  if (parameters.length > 0) {
    body.queryParameters = parameters;
    body.parameterMode = "NAMED";
  }

  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BigQuery query failed: ${err}`);
  }

  const result: BigQueryResult = await res.json();

  if (!result.jobComplete) {
    throw new Error("BigQuery job did not complete within timeout");
  }

  if (!result.rows) return [];

  const fields = result.schema.fields.map((f) => f.name);
  return result.rows.map((row) =>
    Object.fromEntries(fields.map((name, i) => [name, row.f[i]?.v ?? null]))
  );
}

export function intParam(name: string, value: number): QueryParameter {
  return {
    name,
    parameterType: { type: "INT64" },
    parameterValue: { value: String(value) },
  };
}

export function floatParam(name: string, value: number): QueryParameter {
  return {
    name,
    parameterType: { type: "FLOAT64" },
    parameterValue: { value: String(value) },
  };
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/bigquery.ts
git commit -m "feat: add BigQuery auth and query helper for edge functions"
```

---

## Task 2: Endpoint `infracoes-por-tempo`

**Files:**
- Create: `supabase/functions/infracoes-por-tempo/index.ts`

- [ ] **Step 1: Create the function**

Create `supabase/functions/infracoes-por-tempo/index.ts`:

```typescript
import { runQuery, intParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const periodDays = parseInt(url.searchParams.get("period_days") ?? "90", 10);
    const granularity = url.searchParams.get("granularity") === "week" ? "WEEK" : "MONTH";

    const sql = `
      SELECT
        DATE_TRUNC(t.purchase_date, ${granularity}) AS period,
        COUNT(*) AS total_infracoes,
        COUNT(DISTINCT t.cost_center_id) AS cost_centers_afetados
      FROM \`dw-onfly-prd.management_core.protocol_trip_summary\` p
      JOIN \`dw-onfly-prd.cockpit.gold_travelers_date_trip\` t ON t.protocol = p.protocol
      WHERE p.within_policy = false
        AND t.purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @period_days DAY)
      GROUP BY period
      ORDER BY period DESC
    `;

    const rows = await runQuery(sql, [intParam("period_days", periodDays)]);

    const data = rows.map((r) => ({
      period: r.period,
      total_infracoes: Number(r.total_infracoes),
      cost_centers_afetados: Number(r.cost_centers_afetados),
    }));

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Test locally with Supabase CLI**

```bash
cd /Users/pedrosantos/Documents/projects/projetos/productos
supabase functions serve infracoes-por-tempo --env-file .env.local
```

In another terminal:
```bash
curl "http://localhost:54321/functions/v1/infracoes-por-tempo?period_days=90"
```

Expected: JSON with `data` array containing `period`, `total_infracoes`, `cost_centers_afetados`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/infracoes-por-tempo/index.ts
git commit -m "feat: add infracoes-por-tempo edge function"
```

---

## Task 3: Endpoint `tempo-aprovacao-gestor`

**Files:**
- Create: `supabase/functions/tempo-aprovacao-gestor/index.ts`

- [ ] **Step 1: Create the function**

Create `supabase/functions/tempo-aprovacao-gestor/index.ts`:

```typescript
import { runQuery, intParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const periodDays = parseInt(url.searchParams.get("period_days") ?? "30", 10);

    const sql = `
      SELECT
        approver_name,
        COUNT(*) AS total_aprovacoes,
        ROUND(AVG(TIMESTAMP_DIFF(approval_date, previus_date, MINUTE)), 0) AS tempo_medio_minutos,
        COUNTIF(is_finished = 0) AS pendentes
      FROM \`dw-onfly-prd.management_core.all_approvers_travel_bi\`
      WHERE previus_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @period_days DAY)
        AND approver_name IS NOT NULL
      GROUP BY approver_name
      ORDER BY tempo_medio_minutos DESC
    `;

    const rows = await runQuery(sql, [intParam("period_days", periodDays)]);

    const data = rows.map((r) => ({
      approver_name: r.approver_name,
      total_aprovacoes: Number(r.total_aprovacoes),
      tempo_medio_minutos: Number(r.tempo_medio_minutos),
      pendentes: Number(r.pendentes),
    }));

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Test locally**

```bash
supabase functions serve tempo-aprovacao-gestor --env-file .env.local
```

```bash
curl "http://localhost:54321/functions/v1/tempo-aprovacao-gestor?period_days=30"
```

Expected: JSON with `data` array containing `approver_name`, `total_aprovacoes`, `tempo_medio_minutos`, `pendentes`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/tempo-aprovacao-gestor/index.ts
git commit -m "feat: add tempo-aprovacao-gestor edge function"
```

---

## Task 4: Endpoint `auto-aprovacao-sugestao`

**Files:**
- Create: `supabase/functions/auto-aprovacao-sugestao/index.ts`

- [ ] **Step 1: Create the function**

Create `supabase/functions/auto-aprovacao-sugestao/index.ts`:

```typescript
import { runQuery, intParam, floatParam, corsHeaders } from "../_shared/bigquery.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const periodDays = parseInt(url.searchParams.get("period_days") ?? "90", 10);
    const minPct = parseFloat(url.searchParams.get("min_pct") ?? "80");

    const sql = `
      SELECT
        CAST(a.company_id AS INT64) AS company_id,
        COUNT(*) AS total_reservas,
        COUNTIF(p.within_policy = true) AS dentro_politica,
        ROUND(COUNTIF(p.within_policy = true) / COUNT(*) * 100, 1) AS pct_dentro_politica,
        ROUND(AVG(TIMESTAMP_DIFF(a.approval_date, a.previus_date, MINUTE)), 0) AS tempo_medio_aprovacao_min
      FROM \`dw-onfly-prd.management_core.all_approvers_travel_bi\` a
      JOIN \`dw-onfly-prd.management_core.protocol_trip_summary\` p ON p.protocol = a.protocol
      JOIN \`dw-onfly-prd.cockpit.gold_companies_polices_settings\` cfg
        ON cfg.company_id = CAST(a.company_id AS INT64)
      WHERE cfg.employeesNeedApprovalToBuy = 'true'
        AND a.previus_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @period_days DAY)
        AND a.approver_name IS NOT NULL
      GROUP BY a.company_id
      HAVING pct_dentro_politica >= @min_pct
      ORDER BY pct_dentro_politica DESC
    `;

    const rows = await runQuery(sql, [
      intParam("period_days", periodDays),
      floatParam("min_pct", minPct),
    ]);

    const data = rows.map((r) => ({
      company_id: Number(r.company_id),
      total_reservas: Number(r.total_reservas),
      dentro_politica: Number(r.dentro_politica),
      pct_dentro_politica: Number(r.pct_dentro_politica),
      tempo_medio_aprovacao_min: Number(r.tempo_medio_aprovacao_min),
      sugestao: "auto-aprovacao",
    }));

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Test locally**

```bash
supabase functions serve auto-aprovacao-sugestao --env-file .env.local
```

```bash
curl "http://localhost:54321/functions/v1/auto-aprovacao-sugestao?period_days=90&min_pct=80"
```

Expected: JSON with `data` array — empresas com `pct_dentro_politica >= 80` e campo `sugestao: "auto-aprovacao"`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/auto-aprovacao-sugestao/index.ts
git commit -m "feat: add auto-aprovacao-sugestao edge function"
```

---

## Task 5: Configurar env var e fazer deploy

**Pré-requisito:** Ter o JSON da service account do GCP com acesso ao `dw-onfly-prd`.

- [ ] **Step 1: Adicionar BIGQUERY_SERVICE_ACCOUNT ao .env.local**

Criar/editar `.env.local` na raiz do projeto (já no `.gitignore`):

```
BIGQUERY_SERVICE_ACCOUNT={"type":"service_account","project_id":"dw-onfly-prd","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@dw-onfly-prd.iam.gserviceaccount.com",...}
```

- [ ] **Step 2: Fazer deploy das 3 functions**

```bash
cd /Users/pedrosantos/Documents/projects/projetos/productos
supabase functions deploy infracoes-por-tempo
supabase functions deploy tempo-aprovacao-gestor
supabase functions deploy auto-aprovacao-sugestao
```

- [ ] **Step 3: Setar o secret no Supabase**

```bash
supabase secrets set BIGQUERY_SERVICE_ACCOUNT="$(cat path/to/service-account.json)"
```

- [ ] **Step 4: Testar endpoints em produção**

```bash
# Substituir <PROJECT_REF> pelo ref do projeto Supabase
curl "https://<PROJECT_REF>.supabase.co/functions/v1/infracoes-por-tempo?period_days=90"
curl "https://<PROJECT_REF>.supabase.co/functions/v1/tempo-aprovacao-gestor?period_days=30"
curl "https://<PROJECT_REF>.supabase.co/functions/v1/auto-aprovacao-sugestao?period_days=90&min_pct=80"
```

Expected para cada: `{"data":[...]}` com registros reais do BigQuery.

- [ ] **Step 5: Commit final**

```bash
git add .env.example
git commit -m "chore: add BIGQUERY_SERVICE_ACCOUNT to .env.example"
```

---

## Notas de Deploy

- O `_shared/bigquery.ts` é referenciado com caminho relativo `../` — o Supabase CLI empacota automaticamente os imports locais no deploy
- O `granularity` no endpoint 1 usa interpolação de string no SQL (não parâmetro BigQuery) porque é um keyword SQL (`MONTH`/`WEEK`), não um valor — já está sanitizado pelo `=== "week"` ternário antes da interpolação
- Timeout padrão das Edge Functions é 5s — o `timeoutMs: 30000` no `runQuery` é o timeout do BigQuery, mas o Supabase pode cortar antes. Se queries forem lentas, considerar aumentar o timeout da function no dashboard
