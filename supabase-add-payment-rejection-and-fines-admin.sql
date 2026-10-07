-- Execute no SQL Editor do Supabase (depois de supabase-security-hardening.sql)
--
-- 1) Comprovante recusado passa a ficar registrado com o motivo, para o membro
--    ver o que o admin escreveu. Antes o app tentava apagar o pagamento, mas a
--    tabela nao tem policy de DELETE: o pagamento continuava pendente.
-- 2) Admin pode ajustar e remover lancamentos do caixa, necessario para
--    corrigir/excluir uma multa gerada sem querer (a multa vai para o caixa
--    assim que e criada).

ALTER TABLE payments ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'REJEITADO'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cash_ledger'
      AND policyname = 'Admins podem atualizar caixa'
  ) THEN
    CREATE POLICY "Admins podem atualizar caixa"
      ON cash_ledger FOR UPDATE
      USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cash_ledger'
      AND policyname = 'Admins podem excluir do caixa'
  ) THEN
    CREATE POLICY "Admins podem excluir do caixa"
      ON cash_ledger FOR DELETE
      USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));
  END IF;
END $$;
