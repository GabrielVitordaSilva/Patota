-- Execute no SQL Editor DEPOIS de supabase-security-hardening.sql.
-- O script e somente leitura e aborta ao encontrar uma configuracao insegura.
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'members', 'admins', 'events', 'event_rsvp', 'event_attendance',
    'dues', 'exemptions', 'fines', 'cash_ledger', 'payments',
    'points_ledger', 'audit_logs', 'config', 'player_ratings'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_table_name AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS ausente ou desabilitado em public.%', v_table_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id IN ('avatars', 'comprovantes') AND public
  ) THEN
    RAISE EXCEPTION 'Bucket de arquivo sensivel esta publico';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND roles && ARRAY['public', 'anon']::name[]
      AND (coalesce(qual, '') = 'true' OR coalesce(with_check, '') = 'true')
  ) THEN
    RAISE EXCEPTION 'Existe policy irrestrita concedida a public/anon';
  END IF;

  IF has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.is_active_member()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.validate_member_payment()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.validate_event_rsvp()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Funcao SECURITY DEFINER interna executavel por anon';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_validate_member_payment' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Trigger de validacao de pagamentos ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_validate_event_rsvp' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Trigger de validacao de RSVP ausente';
  END IF;
END $$;

SELECT 'OK: RLS, Storage privado, funcoes e triggers criticos validados' AS resultado;
