-- Workspace
INSERT INTO workspaces (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Onfly', 'onfly');

-- North Star Metrics
INSERT INTO metrics (id, workspace_id, name, description, category, unit, frequency, target_value, current_value, source, source_config, is_north_star, display_order) VALUES
  ('m0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'GMV', 'Volume total de transações', 'revenue', 'BRL', 'monthly', 1500000, 1200000, 'bigquery', '{"query": "SELECT SUM(amount) FROM transactions WHERE date BETWEEN @start AND @end"}', true, 1),
  ('m0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'NPS', 'Net Promoter Score', 'satisfaction', '', 'monthly', 75, 72, 'survicate', '{"survey_id": "nps_main"}', true, 2),
  ('m0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Tempo de Aprovação', 'Tempo médio para aprovar solicitação', 'operational', 'h', 'weekly', 2.0, 2.3, 'bigquery', '{"query": "SELECT AVG(approval_time_hours) FROM approvals WHERE date BETWEEN @start AND @end"}', true, 3);

-- Secondary Metrics
INSERT INTO metrics (id, workspace_id, name, description, category, unit, frequency, target_value, current_value, source, source_config, is_north_star, display_order) VALUES
  ('m0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CSAT', 'Customer Satisfaction Score', 'satisfaction', '', 'weekly', 4.5, 4.2, 'survicate', '{"survey_id": "csat_main"}', false, 4),
  ('m0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'CES', 'Customer Effort Score', 'satisfaction', '', 'weekly', 2.5, 2.8, 'survicate', '{"survey_id": "ces_main"}', false, 5),
  ('m0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '% Reservas com Aprovação', 'Reservas feitas com permissão de aprovação', 'operational', '%', 'weekly', 80, 72, 'bigquery', '{}', false, 6),
  ('m0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Aprovações (Aprovadas/Reprovadas)', 'Ratio de aprovações', 'operational', '', 'weekly', NULL, 85, 'bigquery', '{}', false, 7),
  ('m0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Empresas com Orçamento', 'Empresas que utilizam orçamento', 'adoption', '', 'monthly', 150, 127, 'bigquery', '{}', false, 8),
  ('m0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Taxa de Bugs', 'Bugs reportados por sprint', 'quality', '', 'weekly', 5, 8, 'manual', '{}', false, 9);

-- GMV snapshots
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000001', 950000, '2026-02-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 980000, '2026-02-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1020000, '2026-02-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1050000, '2026-03-02', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1100000, '2026-03-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1130000, '2026-03-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1170000, '2026-03-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000001', 1200000, '2026-03-30', 'bigquery');

-- NPS snapshots
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000002', 65, '2026-02-01', 'survicate'),
  ('m0000000-0000-0000-0000-000000000002', 68, '2026-02-15', 'survicate'),
  ('m0000000-0000-0000-0000-000000000002', 70, '2026-03-01', 'survicate'),
  ('m0000000-0000-0000-0000-000000000002', 72, '2026-03-15', 'survicate');

-- Tempo Aprovacao snapshots
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

-- CES snapshots
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000005', 3.5, '2026-02-09', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.3, '2026-02-16', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.2, '2026-02-23', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.1, '2026-03-02', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 3.0, '2026-03-09', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 2.9, '2026-03-16', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 2.8, '2026-03-23', 'survicate'),
  ('m0000000-0000-0000-0000-000000000005', 2.8, '2026-03-30', 'survicate');

-- % Reservas snapshots
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000006', 60, '2026-02-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 62, '2026-02-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 65, '2026-02-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 66, '2026-03-02', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 68, '2026-03-09', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 69, '2026-03-16', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 71, '2026-03-23', 'bigquery'),
  ('m0000000-0000-0000-0000-000000000006', 72, '2026-03-30', 'bigquery');

-- Taxa de Bugs snapshots
INSERT INTO metric_snapshots (metric_id, value, period_start, source) VALUES
  ('m0000000-0000-0000-0000-000000000009', 12, '2026-02-09', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 11, '2026-02-16', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 10, '2026-02-23', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 9, '2026-03-02', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 10, '2026-03-09', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 9, '2026-03-16', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 8, '2026-03-23', 'manual'),
  ('m0000000-0000-0000-0000-000000000009', 8, '2026-03-30', 'manual');

-- OKRs
INSERT INTO objectives (id, workspace_id, title, description, period, level, status, progress) VALUES
  ('o0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Aumentar satisfação e retenção dos clientes', 'Focar em melhorar a experiência do cliente para reduzir churn e aumentar NPS', 'Q2 2026', 'company', 'on_track', 68);

INSERT INTO objectives (id, workspace_id, title, description, period, level, parent_id, status, progress) VALUES
  ('o0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Otimizar fluxo de aprovações', 'Reduzir tempo de aprovação e aumentar taxa de uso do fluxo de permissão', 'Q2 2026', 'team', 'o0000000-0000-0000-0000-000000000001', 'at_risk', 45),
  ('o0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Escalar adoção de orçamento corporativo', 'Aumentar o número de empresas utilizando a funcionalidade de orçamento', 'Q2 2026', 'team', 'o0000000-0000-0000-0000-000000000001', 'on_track', 72);

-- Key Results
INSERT INTO key_results (id, objective_id, title, kr_type, current_value, target_value, baseline_value, weight, unit, linked_metric_id, is_auto_tracked, display_order) VALUES
  ('k0000000-0000-0000-0000-000000000001', 'o0000000-0000-0000-0000-000000000001', 'NPS acima de 75', 'number', 72, 75, 65, 1, '', 'm0000000-0000-0000-0000-000000000002', true, 1),
  ('k0000000-0000-0000-0000-000000000002', 'o0000000-0000-0000-0000-000000000001', 'CSAT acima de 4.5', 'number', 4.2, 4.5, 3.9, 1, '', 'm0000000-0000-0000-0000-000000000004', true, 2),
  ('k0000000-0000-0000-0000-000000000003', 'o0000000-0000-0000-0000-000000000001', 'Reduzir CES para abaixo de 2.5', 'number', 2.8, 2.5, 3.5, 1, '', 'm0000000-0000-0000-0000-000000000005', true, 3),
  ('k0000000-0000-0000-0000-000000000004', 'o0000000-0000-0000-0000-000000000002', 'Tempo de aprovação abaixo de 2h', 'number', 2.3, 2.0, 3.5, 2, 'h', 'm0000000-0000-0000-0000-000000000003', true, 1),
  ('k0000000-0000-0000-0000-000000000005', 'o0000000-0000-0000-0000-000000000002', '80% reservas com permissão de aprovação', 'percentage', 72, 80, 60, 1, '%', 'm0000000-0000-0000-0000-000000000006', true, 2),
  ('k0000000-0000-0000-0000-000000000006', 'o0000000-0000-0000-0000-000000000002', 'Lançar novo painel de aprovação', 'binary', 0, 1, 0, 1, '', NULL, false, 3),
  ('k0000000-0000-0000-0000-000000000007', 'o0000000-0000-0000-0000-000000000003', '150 empresas usando orçamento', 'number', 127, 150, 95, 2, '', 'm0000000-0000-0000-0000-000000000008', true, 1),
  ('k0000000-0000-0000-0000-000000000008', 'o0000000-0000-0000-0000-000000000003', 'GMV acima de R$ 1.5M', 'currency', 1200000, 1500000, 950000, 1, 'BRL', 'm0000000-0000-0000-0000-000000000001', true, 2),
  ('k0000000-0000-0000-0000-000000000009', 'o0000000-0000-0000-0000-000000000003', 'Publicar 3 cases de sucesso', 'number', 1, 3, 0, 1, '', NULL, false, 3);

-- Check-ins
INSERT INTO check_ins (key_result_id, value, confidence, note, created_at) VALUES
  ('k0000000-0000-0000-0000-000000000006', 0, 3, 'Design aprovado, começando desenvolvimento', '2026-03-10T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000006', 0, 3, 'Frontend 60% concluído', '2026-03-17T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000006', 0, 2, 'Bloqueio com API de permissões, precisa de refactor', '2026-03-24T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000006', 0, 2, 'Refactor em andamento, atrasou 1 semana', '2026-03-31T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000009', 0, 4, 'Entrevistas agendadas com 5 clientes', '2026-03-10T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000009', 0, 4, 'Primeiro case em revisão com cliente', '2026-03-17T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000009', 1, 4, 'Case TravelCorp publicado!', '2026-03-24T10:00:00Z'),
  ('k0000000-0000-0000-0000-000000000009', 1, 3, 'Segundo case precisa de mais dados do cliente', '2026-03-31T10:00:00Z');
