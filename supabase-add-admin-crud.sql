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

-- Funcao para excluir o usuario por completo (membro + login no Auth).
-- SECURITY DEFINER permite apagar de auth.users; a propria funcao valida
-- que quem chama e admin e impede a auto-exclusao.
CREATE OR REPLACE FUNCTION delete_member(target_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admins podem excluir membros';
  END IF;

  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Voce nao pode excluir o proprio usuario';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM members WHERE id = target_id) THEN
    RAISE EXCEPTION 'Membro nao encontrado';
  END IF;

  -- Apagar o usuario do Auth cascateia para members e todo o historico
  DELETE FROM auth.users WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION delete_member(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_member(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION delete_member(UUID) TO authenticated;
