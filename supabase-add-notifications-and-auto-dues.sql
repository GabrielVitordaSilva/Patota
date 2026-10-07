-- Execute no SQL Editor do Supabase (depois de supabase-security-hardening.sql)
--
-- 1) Notificacoes dentro do app: novo jogo/evento, nova mensalidade, nova multa
--    e resposta do admin a um comprovante. Sao criadas por triggers no banco;
--    o membro so le e marca as proprias como lidas.
-- 2) Mensalidades geradas automaticamente todo dia 1 (06:00 em Brasilia) com
--    pg_cron. O botao "Gerar mensalidades" do admin continua valendo como
--    reserva (nao duplica: member_id + competencia e unico).
-- Os triggers de notificacao nunca derrubam a operacao original: se algo der
-- errado ao notificar, o evento/mensalidade/multa e salvo do mesmo jeito.

-- ============================================================
-- 1) NOTIFICACOES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_member
  ON public.notifications (member_id, lida, criado_em DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membro le as proprias notificacoes" ON public.notifications;
CREATE POLICY "Membro le as proprias notificacoes"
  ON public.notifications FOR SELECT TO authenticated
  USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Membro marca as proprias como lidas" ON public.notifications;
CREATE POLICY "Membro marca as proprias como lidas"
  ON public.notifications FOR UPDATE TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "Membro apaga as proprias notificacoes" ON public.notifications;
CREATE POLICY "Membro apaga as proprias notificacoes"
  ON public.notifications FOR DELETE TO authenticated
  USING (member_id = auth.uid());

-- Pelo cliente so a coluna "lida" pode mudar; inserir so pelos triggers.
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT UPDATE (lida) ON public.notifications TO authenticated;

-- Novo jogo / evento: avisa todos os membros ativos
CREATE OR REPLACE FUNCTION public.notify_new_event()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifications (member_id, tipo, titulo, mensagem, link)
    SELECT m.id,
           'EVENTO',
           CASE WHEN NEW.tipo = 'JOGO' THEN 'Novo jogo criado' ELSE 'Novo evento criado' END,
           to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
             || COALESCE(' · ' || NULLIF(NEW.local, ''), '')
             || '. Confirme sua presença.',
           '/'
    FROM public.members m
    WHERE m.ativo = true;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_event falhou: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.notify_new_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_new_event ON public.events;
CREATE TRIGGER trg_notify_new_event
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_event();

-- Nova mensalidade: avisa o membro dono
CREATE OR REPLACE FUNCTION public.notify_new_due()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    IF NEW.status = 'PENDENTE' THEN
      INSERT INTO public.notifications (member_id, tipo, titulo, mensagem, link)
      VALUES (
        NEW.member_id,
        'MENSALIDADE',
        'Nova mensalidade gerada',
        'Mensalidade de ' || right(NEW.competencia, 2) || '/' || left(NEW.competencia, 4)
          || ': R$ ' || to_char(NEW.valor, 'FM999990D00')
          || ', vence em ' || to_char(NEW.vencimento, 'DD/MM') || '.',
        '/finance'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_due falhou: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.notify_new_due() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_new_due ON public.dues;
CREATE TRIGGER trg_notify_new_due
  AFTER INSERT ON public.dues
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_due();

-- Nova multa: avisa o membro
CREATE OR REPLACE FUNCTION public.notify_new_fine()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifications (member_id, tipo, titulo, mensagem, link)
    VALUES (
      NEW.member_id,
      'MULTA',
      'Nova multa',
      CASE NEW.tipo
        WHEN 'ATRASO' THEN 'Atraso'
        WHEN 'FALTA_CONFIRMADA' THEN 'Falta confirmada'
        WHEN 'CONVIDADO' THEN 'Convidado'
        ELSE NEW.tipo
      END || ': R$ ' || to_char(NEW.valor, 'FM999990D00') || '.',
      '/finance'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_fine falhou: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.notify_new_fine() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_new_fine ON public.fines;
CREATE TRIGGER trg_notify_new_fine
  AFTER INSERT ON public.fines
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_fine();

-- Resposta do admin ao comprovante (confirmado ou recusado, com o motivo)
CREATE OR REPLACE FUNCTION public.notify_payment_review()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('CONFIRMADO', 'REJEITADO') THEN
      INSERT INTO public.notifications (member_id, tipo, titulo, mensagem, link)
      VALUES (
        NEW.member_id,
        'PAGAMENTO',
        CASE WHEN NEW.status = 'CONFIRMADO' THEN 'Pagamento confirmado' ELSE 'Comprovante recusado' END,
        CASE WHEN NEW.status = 'CONFIRMADO'
          THEN 'Seu pagamento de R$ ' || to_char(NEW.valor, 'FM999990D00') || ' foi confirmado.'
          ELSE 'Envie um novo comprovante.' || COALESCE(' Motivo: ' || NULLIF(NEW.motivo_rejeicao, ''), '')
        END,
        '/finance'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_payment_review falhou: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.notify_payment_review() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_payment_review ON public.payments;
CREATE TRIGGER trg_notify_payment_review
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_review();

-- ============================================================
-- 2) MENSALIDADES AUTOMATICAS (todo dia 1)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_dues(p_ano INTEGER DEFAULT NULL, p_mes INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  ano INTEGER := COALESCE(p_ano, EXTRACT(YEAR FROM hoje)::int);
  mes INTEGER := COALESCE(p_mes, EXTRACT(MONTH FROM hoje)::int);
  comp TEXT := ano || '-' || lpad(mes::text, 2, '0');
  venc DATE := make_date(ano, mes, 10);
  criadas INTEGER;
BEGIN
  INSERT INTO public.dues (member_id, competencia, vencimento, valor, status)
  SELECT m.id,
         comp,
         venc,
         CASE WHEN e.id IS NULL THEN 40 ELSE 0 END,
         CASE WHEN e.id IS NULL THEN 'PENDENTE' ELSE 'ISENTO' END
  FROM public.members m
  LEFT JOIN public.exemptions e ON e.member_id = m.id AND e.competencia = comp
  WHERE m.ativo = true
  ON CONFLICT (member_id, competencia) DO NOTHING;

  GET DIAGNOSTICS criadas = ROW_COUNT;
  RETURN criadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Quem chama e o agendador (postgres); nao fica exposta pela API
REVOKE ALL ON FUNCTION public.generate_monthly_dues(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 09:00 UTC = 06:00 em Brasilia, todo dia 1
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'gerar-mensalidades-mensais';
SELECT cron.schedule('gerar-mensalidades-mensais', '0 9 1 * *', $$SELECT public.generate_monthly_dues()$$);
