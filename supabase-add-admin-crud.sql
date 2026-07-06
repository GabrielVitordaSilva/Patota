-- Execute no SQL Editor do Supabase
-- Habilita o CRUD completo de membros e a edicao manual do ranking pelos admins

-- Observacao livre nos lancamentos de pontos (usada nos ajustes manuais)
ALTER TABLE points_ledger ADD COLUMN IF NOT EXISTS obs TEXT;

-- Politicas para admins gerenciarem membros e pontos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'members'
      AND policyname = 'Admins podem atualizar membros'
  ) THEN
    CREATE POLICY "Admins podem atualizar membros"
      ON members FOR UPDATE
      USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'members'
      AND policyname = 'Admins podem excluir membros'
  ) THEN
    CREATE POLICY "Admins podem excluir membros"
      ON members FOR DELETE
      USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'points_ledger'
      AND policyname = 'Admins podem atualizar pontos'
  ) THEN
    CREATE POLICY "Admins podem atualizar pontos"
      ON points_ledger FOR UPDATE
      USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'points_ledger'
      AND policyname = 'Admins podem excluir pontos'
  ) THEN
    CREATE POLICY "Admins podem excluir pontos"
      ON points_ledger FOR DELETE
      USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));
  END IF;
END $$;

-- Referencias que apontavam para members bloqueavam a exclusao de um membro;
-- passam a ficar nulas mantendo o historico (eventos, caixa, logs, isencoes)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_criado_por_fkey;
ALTER TABLE events ADD CONSTRAINT events_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE cash_ledger DROP CONSTRAINT IF EXISTS cash_ledger_lancado_por_fkey;
ALTER TABLE cash_ledger ADD CONSTRAINT cash_ledger_lancado_por_fkey
  FOREIGN KEY (lancado_por) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_member_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE exemptions DROP CONSTRAINT IF EXISTS exemptions_aprovado_por_fkey;
ALTER TABLE exemptions ADD CONSTRAINT exemptions_aprovado_por_fkey
  FOREIGN KEY (aprovado_por) REFERENCES members(id) ON DELETE SET NULL;
