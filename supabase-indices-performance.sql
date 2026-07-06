-- =============================================================
-- Indices de performance - Patota CCC
-- Rodar uma unica vez no SQL Editor do Supabase.
-- Cobrem exatamente os filtros usados pelo app. Em tabelas pequenas
-- o ganho e discreto, mas garante que as queries continuem rapidas
-- conforme o historico de eventos/multas/pontos crescer.
-- =============================================================

-- Home / Events: busca do proximo evento e listagens ordenadas por data
CREATE INDEX IF NOT EXISTS idx_events_data_hora
  ON events (data_hora);

-- Home / Finance: pendencias do usuario (dues por membro + status)
CREATE INDEX IF NOT EXISTS idx_dues_member_status
  ON dues (member_id, status);

-- Home / Finance: multas nao pagas do usuario
CREATE INDEX IF NOT EXISTS idx_fines_member_pago
  ON fines (member_id, pago);

-- Relatorio mensal admin: multas por periodo
CREATE INDEX IF NOT EXISTS idx_fines_criado_em
  ON fines (criado_em);

-- Admin > Pagamentos: fila de pendentes ordenada por criacao
CREATE INDEX IF NOT EXISTS idx_payments_status_criado
  ON payments (status, criado_em);

-- Ranking geral/mensal e estatisticas do usuario
CREATE INDEX IF NOT EXISTS idx_points_member
  ON points_ledger (member_id);

CREATE INDEX IF NOT EXISTS idx_points_criado_em
  ON points_ledger (criado_em);

-- Estatisticas de presenca do usuario
CREATE INDEX IF NOT EXISTS idx_attendance_member
  ON event_attendance (member_id);

-- Caixa: extrato filtrado/ordenado por data
CREATE INDEX IF NOT EXISTS idx_cash_ledger_criado_em
  ON cash_ledger (criado_em);

-- Obs: event_rsvp(event_id, member_id), dues(member_id, competencia) e
-- admins(member_id) ja possuem indice implicito pelas constraints UNIQUE
-- do schema original - nao precisam de indice adicional.
