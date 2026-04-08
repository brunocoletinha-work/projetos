# BigQuery Endpoints — Design Spec

**Data:** 2026-04-08
**Autor:** Coletinha + Claude
**Status:** Aprovado

---

## 1. Visão Geral

Três Supabase Edge Functions que conectam ao BigQuery (`dw-onfly-prd`) e servem dados de compliance de viagens para o frontend do ProductOS.

**Motivação:** Demo do hackathon — mostrar infrações de política, gargalos de aprovação e sugestões de auto-aprovação com dados reais da Onfly.

---

## 2. Arquitetura

```
Frontend (React + TanStack Query)
    ↓ fetch (sem auth — demo)
Supabase Edge Function (Deno)
    ↓ BigQuery REST API (JWT via Service Account)
dw-onfly-prd (BigQuery)
    ├── management_core.protocol_trip_summary
    ├── management_core.all_approvers_travel_bi
    ├── management_core.gold_companies_polices_settings (via cockpit)
    └── cockpit.gold_travelers_date_trip
```

### Princípios

- **Sem auth no endpoint** — demo, adicionar depois
- **Sem otimização de query** — precisa funcionar, não ser rápido
- **Nomes de campo como estão** — não normalizar, frontend adapta
- **Parameterized queries** — nunca concatenar strings SQL (segurança)

---

## 3. Autenticação BigQuery

Arquivo compartilhado `supabase/functions/_shared/bigquery.ts`.

**Fluxo:**
1. Lê `BIGQUERY_SERVICE_ACCOUNT` env var (JSON da service account)
2. Gera JWT assinado com RS256 (usando `crypto.subtle` do Deno)
3. Troca JWT por OAuth2 access token via `https://oauth2.googleapis.com/token`
4. Usa access token no header `Authorization: Bearer` para chamadas à BigQuery REST API

**Endpoint BigQuery usado:**
```
POST https://bigquery.googleapis.com/bigquery/v2/projects/dw-onfly-prd/queries
```

---

## 4. Estrutura de Arquivos

```
supabase/functions/
  _shared/
    bigquery.ts                  ← getAccessToken() + runQuery()
  infracoes-por-tempo/
    index.ts
  tempo-aprovacao-gestor/
    index.ts
  auto-aprovacao-sugestao/
    index.ts
```

---

## 5. Endpoints

### 5.1 `infracoes-por-tempo`

**Método:** GET
**Parâmetros query string:**
- `period_days` (int, default 90)
- `granularity` (`month` | `week`, default `month`)

**Tabelas:**
- `dw-onfly-prd.management_core.protocol_trip_summary` — campo `within_policy` (BOOLEAN)
- `dw-onfly-prd.cockpit.gold_travelers_date_trip` — `protocol`, `purchase_date`, `cost_center_id`

**Query validada:**
```sql
SELECT
  DATE_TRUNC(t.purchase_date, MONTH) AS period,
  COUNT(*) AS total_infracoes,
  COUNT(DISTINCT t.cost_center_id) AS cost_centers_afetados
FROM `dw-onfly-prd.management_core.protocol_trip_summary` p
JOIN `dw-onfly-prd.cockpit.gold_travelers_date_trip` t ON t.protocol = p.protocol
WHERE p.within_policy = false
  AND t.purchase_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @period_days DAY)
GROUP BY period
ORDER BY period DESC
```

**Response:**
```json
{
  "data": [
    { "period": "2026-03-01", "total_infracoes": 26187, "cost_centers_afetados": 5992 },
    { "period": "2026-02-01", "total_infracoes": 19621, "cost_centers_afetados": 4716 },
    { "period": "2026-01-01", "total_infracoes": 14340, "cost_centers_afetados": 3828 }
  ]
}
```

---

### 5.2 `tempo-aprovacao-gestor`

**Método:** GET
**Parâmetros query string:**
- `period_days` (int, default 30)

**Tabela:** `dw-onfly-prd.management_core.all_approvers_travel_bi`

**Campos usados:** `approver_name`, `approval_date`, `previus_date`, `is_finished`

**Query validada:**
```sql
SELECT
  approver_name,
  COUNT(*) AS total_aprovacoes,
  ROUND(AVG(TIMESTAMP_DIFF(approval_date, previus_date, MINUTE)), 0) AS tempo_medio_minutos,
  COUNTIF(is_finished = 0) AS pendentes
FROM `dw-onfly-prd.management_core.all_approvers_travel_bi`
WHERE previus_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @period_days DAY)
  AND approver_name IS NOT NULL
GROUP BY approver_name
ORDER BY tempo_medio_minutos DESC
```

**Response:**
```json
{
  "data": [
    { "approver_name": "Taylon Dias", "total_aprovacoes": 4, "tempo_medio_minutos": 5, "pendentes": 0 },
    { "approver_name": "Carlos Silva", "total_aprovacoes": 1, "tempo_medio_minutos": 1495, "pendentes": 0 }
  ]
}
```

---

### 5.3 `auto-aprovacao-sugestao`

**Método:** GET
**Parâmetros query string:**
- `period_days` (int, default 90)
- `min_pct` (int, default 80) — % mínimo dentro da política para sugerir auto-aprovação

**Tabelas:**
- `dw-onfly-prd.management_core.all_approvers_travel_bi` — `company_id`, `protocol`, `approval_date`, `previus_date`
- `dw-onfly-prd.management_core.protocol_trip_summary` — `within_policy`
- `dw-onfly-prd.cockpit.gold_companies_polices_settings` — `employeesNeedApprovalToBuy`

**Lógica:** Empresas que têm fluxo de aprovação ativo (`employeesNeedApprovalToBuy = 'true'`) mas historicamente aprovam >= `min_pct`% das reservas dentro da política. Candidatas a habilitar auto-aprovação.

**Query validada:**
```sql
SELECT
  CAST(a.company_id AS INT64) AS company_id,
  COUNT(*) AS total_reservas,
  COUNTIF(p.within_policy = true) AS dentro_politica,
  ROUND(COUNTIF(p.within_policy = true) / COUNT(*) * 100, 1) AS pct_dentro_politica,
  ROUND(AVG(TIMESTAMP_DIFF(a.approval_date, a.previus_date, MINUTE)), 0) AS tempo_medio_aprovacao_min
FROM `dw-onfly-prd.management_core.all_approvers_travel_bi` a
JOIN `dw-onfly-prd.management_core.protocol_trip_summary` p ON p.protocol = a.protocol
JOIN `dw-onfly-prd.cockpit.gold_companies_polices_settings` cfg
  ON cfg.company_id = CAST(a.company_id AS INT64)
WHERE cfg.employeesNeedApprovalToBuy = 'true'
  AND a.previus_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @period_days DAY)
  AND a.approver_name IS NOT NULL
GROUP BY a.company_id
HAVING pct_dentro_politica >= @min_pct
ORDER BY pct_dentro_politica DESC
```

**Response:**
```json
{
  "data": [
    {
      "company_id": 7315,
      "total_reservas": 191,
      "dentro_politica": 191,
      "pct_dentro_politica": 100.0,
      "tempo_medio_aprovacao_min": 17,
      "sugestao": "auto-aprovacao"
    }
  ]
}
```

---

## 6. Variáveis de Ambiente (Supabase)

| Variável | Descrição |
|----------|-----------|
| `BIGQUERY_SERVICE_ACCOUNT` | JSON completo da service account com permissão `bigquery.jobs.create` e leitura nos datasets `management_core`, `cockpit`, `sourcing` |

Configurar via: `supabase secrets set BIGQUERY_SERVICE_ACCOUNT='...'`

---

## 7. Fora de Escopo

- Autenticação/autorização nos endpoints
- Otimização de queries (índices, cache)
- Normalização de nomes de campos
- Tratamento de erros além de HTTP 500 genérico
- Integração com frontend (hooks React) — fase posterior

---

## 8. Datasets Mapeados

| Dataset | Tabela | Uso |
|---------|--------|-----|
| `management_core` | `protocol_trip_summary` | `within_policy` (infração) |
| `management_core` | `all_approvers_travel_bi` | aprovador, tempo, pendentes |
| `management_core` | `gold_companies_polices_settings` | flag `employeesNeedApprovalToBuy` |
| `cockpit` | `gold_travelers_date_trip` | `cost_center_id`, `purchase_date` |
| `cockpit` | `gold_companies_polices_settings` | política por empresa |
