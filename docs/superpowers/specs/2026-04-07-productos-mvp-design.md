# ProductOS — Design Spec (MVP / Fase 1)

**Data:** 2026-04-07
**Autor:** Coletinha + Claude
**Status:** Draft para revisao

---

## 1. Visao Geral

ProductOS eh uma plataforma responsiva de controle de gestao de produto para a Onfly. Centraliza metricas, OKRs e integrações em um unico lugar, substituindo planilhas, Jira e Asana espalhados.

**Motivacao:** Time enxuto (vagas de PM fechadas), Coleta precisa ganhar eficiencia e engajar em mais projetos. Projeto validado pela Onfly.

**Uso inicial:** Coleta como PM individual. Arquitetado para expandir pro time.

---

## 2. Faseamento

| Fase | Escopo | Prioridade |
|------|--------|------------|
| 1A | Dashboard de metricas (BigQuery + Survicate + manual) | Agora |
| 1B | OKRs com check-in e vinculacao a metricas | Apos 1A |
| 2 | Jira + Discovery + Delivery + Pessoas + Velocidade | Futuro |
| 3 | Impacto pos-entrega + Assistente IA | Futuro |

Este spec cobre apenas Fase 1A e 1B.

---

## 3. Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Icones | Lucide React |
| Fonte | Inter (Google Fonts) |
| State/Fetching | TanStack Query (cache + fetching) + Zustand (estado global) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod (validacao) |
| Graficos | Recharts |
| Auth + DB | Supabase (PostgreSQL + Auth + Edge Functions + Vault) |
| Metricas de negocio | BigQuery (read-only via Edge Function proxy) |
| Integracao | Survicate API (NPS, CSAT, CES) |
| Deploy | Vercel (frontend) + Supabase (backend) |

---

## 4. Design System

| Propriedade | Valor |
|-------------|-------|
| Cor primaria | #1E3A5F (navy escuro) |
| Cor acento | #2E86AB (azul claro) |
| Fundo | #F8FAFC |
| Cards | branco, shadow-sm |
| Border radius | 12px cards, 8px inputs |
| Status verde | #27AE60 (no caminho / meta atingida) |
| Status laranja | #E67E22 (em risco / perto da meta) |
| Status vermelho | #E74C3C (fora do caminho / longe da meta) |
| Status cinza | #95A5A6 (inativo) |
| Sidebar | colapsavel, 240px aberta, icones-only colapsada |
| Header | fixo, breadcrumb + avatar do usuario |
| Responsivo | mobile-first (sm/md/lg/xl breakpoints) |

---

## 5. Arquitetura

### 5.1 Principio de Dados

Cada fonte eh dona do seu dado. Sem sync bidirecional.

- **Supabase** = dados que o ProductOS cria (OKRs, check-ins, configs, snapshots de APIs externas)
- **BigQuery** = dados de negocio que ja existem la (GMV, aprovacoes, reservas). Leitura direta.
- **Survicate** = pesquisas de satisfacao. Poll periodico salva snapshots no Supabase.

### 5.2 Fluxo de Dados

```
BigQuery ──(query direta via Edge Function)──> Dashboard
Survicate ──(API poll via Edge Function)──> metric_snapshots (Supabase) ──> Dashboard
Manual ──(input do usuario)──> metric_snapshots (Supabase) ──> Dashboard
```

### 5.3 Multi-tenancy

Toda tabela tem `workspace_id`. Hoje existe um workspace com um usuario. RLS no Supabase garante isolamento. Quando o time entrar, basta adicionar members ao workspace.

### 5.4 Seguranca

- Auth via Supabase (email/senha, expandivel pra SSO)
- RLS por `workspace_id` em todas as tabelas
- Tokens de integracao criptografados via Supabase Vault
- Edge Function como proxy pro BigQuery (credentials nunca no frontend)

---

## 6. Banco de Dados

### 6.1 Tabelas

```sql
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

-- Metricas
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

-- Configuracoes de integracao
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
```

### 6.2 Notas sobre o Schema

- `metrics.source_config` (JSONB): guarda a configuracao especifica da fonte. Para BigQuery: `{ "query": "SELECT ...", "project_id": "..." }`. Para Survicate: `{ "survey_id": "..." }`.
- `metrics.is_north_star`: marca as 3 metricas norte (GMV, NPS, Tempo de Aprovacao) que ficam em destaque no dashboard.
- `metric_snapshots.segment_type` e `segment_value`: permitem fatiar por cliente, size, data. Ex: `segment_type = 'client_size'`, `segment_value = 'enterprise'`.
- `key_results.linked_metric_id` e `is_auto_tracked`: quando vinculado a uma metrica, o KR atualiza automaticamente sem check-in manual.
- Tokens sensiveis (Jira, Survicate API keys) ficam no Supabase Vault, NAO em `data_sources.config`.

---

## 7. Rotas da Aplicacao

| Rota | Descricao |
|------|-----------|
| `/` | Redirect para `/dashboard` |
| `/login` | Login (Supabase Auth email/senha) |
| `/dashboard` | Dashboard de metricas |
| `/dashboard/metrics/:id` | Detalhe de uma metrica (grafico completo + snapshots) |
| `/okrs` | Lista de OKRs |
| `/okrs/new` | Criar novo OKR |
| `/okrs/:id` | Detalhe do OKR (KRs + check-ins + historico) |
| `/settings` | Configuracoes (perfil, data sources, metricas) |

---

## 8. Telas

### 8.1 Dashboard (Fase 1A)

**Layout:**

```
Filtros globais: [Periodo v] [Size do cliente v] [Cliente v]

Faixa Norte (3 cards destacados):
  [GMV: R$ 1.2M ↑8%] [NPS: 72 ↑12%] [Tempo Aprov: 2.3h ↓15%]

Grid de metricas secundarias (3 colunas desktop, 2 tablet, 1 mobile):
  Cada card: nome, valor, variacao, sparkline, status vs meta

Area de graficos (expansivel por metrica):
  Clique em qualquer card → expande grafico de area com serie temporal + meta tracejada
```

**Filtros globais:**
- Periodo: 7d / 30d / 90d / trimestre / custom
- Size do cliente: dropdown (filtro passado como parametro pro BigQuery WHERE e filtro no Supabase)
- Cliente especifico: autocomplete

**KPI Card (componente):**
- Valor atual grande + unidade
- Variacao vs periodo anterior (seta colorida + %)
- Sparkline (ultimos N pontos, Recharts LineChart sem eixos)
- Tag de status vs meta: verde (atingida), laranja (perto), vermelho (longe)
- Clique expande grafico detalhado

**Metricas norte (is_north_star = true):** GMV, NPS, Tempo de Aprovacao. Cards maiores no topo.

**Metricas secundarias:** CSAT, CES, % reservas com permissao, aprovacoes aprovadas/reprovadas, empresas que utilizam orcamento, taxa de bugs (manual ate Jira entrar na Fase 2).

### 8.2 Detalhe da Metrica

- Grafico de area (Recharts AreaChart) com serie temporal completa
- Linha de meta tracejada
- Filtros de segmento (size, cliente) com grafico reagindo
- Tabela de snapshots com paginacao
- Card lateral: atual vs meta, variacao %, ultimo update, fonte
- OKRs vinculados a esta metrica (se houver)

### 8.3 OKRs - Listagem (Fase 1B)

```
Tabs: Todos | Empresa | Time | Individual
Filtros: [Periodo v] [Status v]
Botao: [+ Novo OKR]

Cards expansiveis:
  Header: titulo, periodo, owner, % progresso, status badge
  Corpo: KRs com barra de progresso individual
  Footer: [Check-in] [Ver detalhes]
```

### 8.4 OKR - Detalhe

- Breadcrumb: OKRs > [titulo]
- Card resumo: titulo, descricao, owner, periodo, status, progresso geral
- Tabela de Key Results: nome, tipo, baseline, atual, meta, progresso (barra), confianca
  - KRs automaticos mostram badge "Auto" e link pra metrica
  - KRs manuais mostram botao "Check-in"
- Timeline de check-ins: data, valor, confianca (1-5 emojis), nota
- Metricas vinculadas: chips clicaveis

### 8.5 Check-in (modal)

- Nome do KR (readonly)
- Valor atual (input numerico com label da unidade)
- Confianca: slider 1-5 com emojis (1=preocupado, 5=confiante)
- Nota/comentario (textarea)
- Salvar: atualiza `key_results.current_value`, cria `check_in`, recalcula progresso do objective

### 8.6 Formulario de OKR

- Titulo do Objective
- Descricao
- Periodo (dropdown: Q1/Q2/Q3/Q4 + ano)
- Nivel: empresa / time / individual
- OKR pai (opcional, autocomplete dos OKRs de nivel superior)
- Secao Key Results (adicionar N):
  - Titulo do KR
  - Tipo: numero / % / moeda / binario
  - Baseline, meta, unidade
  - Vincular a metrica (opcional, autocomplete)
  - Peso

### 8.7 Settings

Tabs: Perfil | Data Sources | Metricas

**Perfil:** nome, email, avatar
**Data Sources:** lista de fontes configuradas (BigQuery, Survicate) com status de conexao, botao testar, ultimo sync
**Metricas:** CRUD de metricas (nome, fonte, query/config, meta, frequencia, is_north_star, ordem de exibicao)

---

## 9. Componentes Reutilizaveis

| Componente | Descricao |
|------------|-----------|
| `ProgressBar` | Barra de progresso com cor automatica por valor (verde/laranja/vermelho) |
| `StatusBadge` | Badge colorido (on_track / at_risk / off_track / done) |
| `MetricCard` | Card de KPI com valor, variacao, sparkline, status |
| `NorthStarCard` | Versao destacada do MetricCard para metricas norte |
| `OKRCard` | Card expansivel com header, KRs, acoes |
| `ConfidenceSlider` | Slider 1-5 com emojis |
| `SparklineChart` | Mini grafico sem eixos (Recharts) |
| `FilterBar` | Filtros globais (periodo, size, cliente) |
| `EmptyState` | Estado vazio com icone, titulo, descricao, CTA |
| `LoadingSkeleton` | Skeleton screens para loading |
| `ConfirmDialog` | Dialog de confirmacao antes de deletar |

---

## 10. Edge Functions

### 10.1 `query-bigquery`

Proxy seguro para consultar BigQuery a partir do frontend.

- Recebe: `metric_id` + filtros (periodo, segmento)
- Le `metrics.source_config` pra pegar a query template
- Injeta filtros como parametros nomeados do BigQuery (parameterized queries, nunca concatenacao de string) para prevenir SQL injection
- Valida que o metric_id pertence ao workspace do usuario autenticado
- Executa no BigQuery e retorna resultado
- Credentials do BigQuery via variavel de ambiente (nunca no frontend)

### 10.2 `sync-survicate`

Poll da API do Survicate para salvar snapshots.

- Roda sob demanda (botao) ou via cron (diario)
- Le `data_sources` do tipo 'survicate'
- Busca respostas do survey via API
- Calcula NPS/CSAT/CES por periodo
- Salva `metric_snapshots` com `source = 'survicate'`
- Suporta segmentacao se o Survicate tiver atributos de cliente/size

---

## 11. Requisitos de Qualidade

- 100% TypeScript (strict mode)
- Responsivo mobile-first (breakpoints sm/md/lg/xl)
- Loading states com skeleton screens em todas as listas e graficos
- Empty states com CTA quando nao ha dados
- Toasts de sucesso/erro em todas as acoes
- Confirmacao antes de deletar (ConfirmDialog)
- Validacao de formularios com React Hook Form + Zod
- Todas as queries com loading, error e empty state
- Sidebar recolhivel com estado salvo no localStorage

---

## 12. Seed Data (desenvolvimento)

Para facilitar desenvolvimento e demo:
- 1 workspace "Onfly"
- 1 usuario Coleta
- 9 metricas configuradas (3 norte + 6 secundarias) com fontes variadas
- Snapshots das ultimas 8 semanas para todas as metricas
- 3 OKRs (1 empresa, 2 time) com periodo Q2 2026
- Cada OKR com 3 KRs em diferentes estados de progresso (incluindo 1 auto-tracked)
- Check-ins das ultimas 4 semanas para KRs manuais

---

## 13. Fora de Escopo (Fase 1)

- Integracao Jira (Fase 2, aguardando tech lead)
- Discovery e Delivery (Fase 2)
- Visao de pessoas e velocidade do time (Fase 2)
- Impacto pos-entrega (Fase 3)
- Assistente IA (Fase 3)
- SSO / login social
- Notificacoes push
- Export de relatorios
- API publica
