-- Execute no SQL Editor do Supabase (depois de supabase-add-notifications-and-auto-dues.sql)
--
-- 1) Realtime: as telas se atualizam sozinhas quando o admin altera dados.
-- 2) Push no celular: inscricoes dos aparelhos + trigger que chama a Edge Function
--    "send-push" (supabase/functions/send-push) a cada notificacao criada.
--
-- Depois de rodar este arquivo, publique a funcao:
--    supabase functions deploy send-push        (com verificacao de JWT ligada)
-- Ela gera sozinha as chaves VAPID na primeira chamada e as guarda em push_config.
-- Troque a URL e a chave anon abaixo pelas do seu projeto.

-- ============================================================
-- 1) REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.events, public.event_rsvp, public.event_attendance, public.dues, public.fines,
  public.payments, public.notifications, public.points_ledger, public.members,
  public.player_ratings, public.config, public.cash_ledger;

-- ============================================================
-- 2) PUSH
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_enviado_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_member ON public.push_subscriptions (member_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membro le as proprias inscricoes push" ON public.push_subscriptions FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY "Membro apaga as proprias inscricoes push" ON public.push_subscriptions FOR DELETE TO authenticated USING (member_id = auth.uid());
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;

-- Chaves VAPID: so a Edge Function (service role) le e escreve; nenhum cliente enxerga
CREATE TABLE IF NOT EXISTS public.push_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_config FROM anon, authenticated;

-- O aparelho passa a pertencer a quem entrou por ultimo (aparelho compartilhado)
CREATE OR REPLACE FUNCTION public.register_push_subscription(p_endpoint TEXT, p_p256dh TEXT, p_auth TEXT, p_user_agent TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado';
  END IF;

  INSERT INTO public.push_subscriptions (member_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  ON CONFLICT (endpoint) DO UPDATE
    SET member_id = EXCLUDED.member_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.unregister_push_subscription(p_endpoint TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint AND member_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.register_push_subscription(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unregister_push_subscription(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_subscription(TEXT) TO authenticated;

-- Cada notificacao criada dispara o envio do push (assincrono, depois do commit).
-- Se falhar, a notificacao dentro do app continua valendo.
CREATE OR REPLACE FUNCTION public.push_after_notification()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://SEU-PROJETO.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SUA-CHAVE-ANON'
      ),
      body := jsonb_build_object('id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push_after_notification falhou: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

REVOKE ALL ON FUNCTION public.push_after_notification() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER trg_push_after_notification AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.push_after_notification();
