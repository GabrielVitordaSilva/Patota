-- Execute no SQL Editor do Supabase
-- ============================================================
-- ENDURECIMENTO DE SEGURANCA
-- ============================================================
-- A anon key do Supabase fica visivel no navegador (F12) por design.
-- Toda a seguranca real precisa estar nas policies (RLS) do banco.
-- Este arquivo fecha os pontos abertos:
--   1. Leitura anonima de dados (membros, emails, eventos, pontos, config)
--   2. Cadastro proprio via API virando membro ativo automaticamente
--   3. Membro alterando os proprios campos sensiveis (ativo, email)
--   4. Pagamento inserido ja como CONFIRMADO via API
--   5. Fotos e comprovantes em buckets publicos, upload sem dono
-- Pode ser executado mais de uma vez sem problema (idempotente).

-- ============================================================
-- 1) FUNCOES AUXILIARES
-- SECURITY DEFINER evita recursao de RLS e centraliza as checagens
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE member_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND ativo = true);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Funcoes recebem EXECUTE de PUBLIC por padrao no PostgreSQL. Elas sao usadas
-- pelas policies, mas nao precisam ficar chamaveis por visitantes anonimos.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member() TO authenticated;

-- ============================================================
-- 2) FIM DA LEITURA ANONIMA
-- As policies antigas com USING (true) valiam para qualquer pessoa
-- com a anon key, mesmo sem login. Agora tudo exige login e, para os
-- dados do grupo, cadastro ATIVO (aprovado pelo admin).
-- ============================================================

DROP POLICY IF EXISTS "Todos podem ver membros" ON members;
DROP POLICY IF EXISTS "Membros autenticados veem membros" ON members;
CREATE POLICY "Membros autenticados veem membros"
  ON members FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_active_member() OR public.is_admin());

DROP POLICY IF EXISTS "Apenas admins podem ver admins" ON admins;
DROP POLICY IF EXISTS "Admins e o proprio veem admins" ON admins;
CREATE POLICY "Admins e o proprio veem admins"
  ON admins FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Todos podem ver eventos" ON events;
DROP POLICY IF EXISTS "Membros ativos veem eventos" ON events;
CREATE POLICY "Membros ativos veem eventos"
  ON events FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.is_admin());

DROP POLICY IF EXISTS "Todos podem ver RSVP" ON event_rsvp;
DROP POLICY IF EXISTS "Membros ativos veem RSVP" ON event_rsvp;
CREATE POLICY "Membros ativos veem RSVP"
  ON event_rsvp FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.is_admin());

DROP POLICY IF EXISTS "Membros podem criar próprio RSVP" ON event_rsvp;
DROP POLICY IF EXISTS "Membro ativo cria proprio RSVP" ON event_rsvp;
CREATE POLICY "Membro ativo cria proprio RSVP"
  ON event_rsvp FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id AND public.is_active_member());

DROP POLICY IF EXISTS "Membros podem atualizar próprio RSVP" ON event_rsvp;
DROP POLICY IF EXISTS "Membro ativo atualiza proprio RSVP" ON event_rsvp;
CREATE POLICY "Membro ativo atualiza proprio RSVP"
  ON event_rsvp FOR UPDATE TO authenticated
  USING (auth.uid() = member_id AND public.is_active_member())
  WITH CHECK (auth.uid() = member_id AND public.is_active_member());

-- O prazo tambem precisa ser imposto no banco: esconder/desabilitar o botao no
-- React nao impede uma chamada manual pelo console ou por outro cliente HTTP.
CREATE OR REPLACE FUNCTION public.validate_event_rsvp()
RETURNS TRIGGER AS $$
DECLARE
  confirmation_deadline timestamptz;
  teams_already_generated boolean;
BEGIN
  SELECT data_limite_confirmacao, times_gerados
    INTO confirmation_deadline, teams_already_generated
    FROM public.events
    WHERE id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento inexistente';
  END IF;

  IF teams_already_generated OR confirmation_deadline IS NULL OR now() > confirmation_deadline THEN
    RAISE EXCEPTION 'Confirmacoes encerradas para este evento';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.validate_event_rsvp() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_event_rsvp ON event_rsvp;
CREATE TRIGGER trg_validate_event_rsvp
  BEFORE INSERT OR UPDATE ON event_rsvp
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_rsvp();

DROP POLICY IF EXISTS "Todos podem ver presença" ON event_attendance;
DROP POLICY IF EXISTS "Membros ativos veem presenca" ON event_attendance;
CREATE POLICY "Membros ativos veem presenca"
  ON event_attendance FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.is_admin());

DROP POLICY IF EXISTS "Todos podem ver pontos" ON points_ledger;
DROP POLICY IF EXISTS "Membros ativos veem pontos" ON points_ledger;
CREATE POLICY "Membros ativos veem pontos"
  ON points_ledger FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.is_admin());

DROP POLICY IF EXISTS "Todos podem ler config" ON config;
DROP POLICY IF EXISTS "Membros ativos leem config" ON config;
CREATE POLICY "Membros ativos leem config"
  ON config FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.is_admin());

DROP POLICY IF EXISTS "Todos podem ver avaliacoes" ON player_ratings;
DROP POLICY IF EXISTS "Membros ativos veem avaliacoes" ON player_ratings;
CREATE POLICY "Membros ativos veem avaliacoes"
  ON player_ratings FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.is_admin());

DROP POLICY IF EXISTS "Membro cria propria avaliacao" ON player_ratings;
DROP POLICY IF EXISTS "Membro ativo cria propria avaliacao" ON player_ratings;
CREATE POLICY "Membro ativo cria propria avaliacao"
  ON player_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_member_id AND public.is_active_member());

DROP POLICY IF EXISTS "Membro atualiza propria avaliacao" ON player_ratings;
DROP POLICY IF EXISTS "Membro ativo atualiza propria avaliacao" ON player_ratings;
CREATE POLICY "Membro ativo atualiza propria avaliacao"
  ON player_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = rater_member_id AND public.is_active_member())
  WITH CHECK (auth.uid() = rater_member_id AND public.is_active_member());

-- ============================================================
-- 3) PAGAMENTO NAO PODE NASCER CONFIRMADO
-- Via API dava para inserir um pagamento proprio ja com status
-- CONFIRMADO. Agora todo pagamento criado por membro entra PENDENTE.
-- ============================================================

DROP POLICY IF EXISTS "Membros podem criar próprios pagamentos" ON payments;
DROP POLICY IF EXISTS "Membro ativo cria pagamento pendente" ON payments;
CREATE POLICY "Membro ativo cria pagamento pendente"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id AND status = 'PENDENTE' AND public.is_active_member());

-- Nao confia em valor, referencia ou caminho enviados pelo navegador. O cliente
-- pode ser alterado pelo DevTools; portanto o banco valida a propriedade da
-- cobranca, fixa o valor oficial e exige comprovante na pasta do proprio membro.
CREATE OR REPLACE FUNCTION public.validate_member_payment()
RETURNS TRIGGER AS $$
DECLARE
  expected_value numeric(10, 2);
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR NEW.member_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Pagamento deve pertencer ao usuario autenticado';
  END IF;

  NEW.status := 'PENDENTE';

  IF NEW.due_id IS NOT NULL AND NEW.fine_id IS NULL THEN
    SELECT valor INTO expected_value
      FROM public.dues
      WHERE id = NEW.due_id AND member_id = auth.uid() AND status = 'PENDENTE';
  ELSIF NEW.fine_id IS NOT NULL AND NEW.due_id IS NULL THEN
    SELECT valor INTO expected_value
      FROM public.fines
      WHERE id = NEW.fine_id AND member_id = auth.uid() AND pago = false;
  ELSE
    RAISE EXCEPTION 'Pagamento deve referenciar uma unica cobranca';
  END IF;

  IF expected_value IS NULL THEN
    RAISE EXCEPTION 'Cobranca invalida ou ja quitada';
  END IF;

  NEW.valor := expected_value;

  IF NEW.comprovante_url IS NULL
     OR NEW.comprovante_url NOT LIKE auth.uid()::text || '/%' THEN
    RAISE EXCEPTION 'Caminho de comprovante invalido';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.validate_member_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_member_payment ON payments;
CREATE TRIGGER trg_validate_member_payment
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_member_payment();

-- ============================================================
-- 4) PERFIL PROPRIO NAO MUDA CAMPOS SENSIVEIS
-- A policy de auto-edicao permitia ao membro alterar o proprio
-- "ativo" (se auto-aprovar) e o email. Este trigger congela esses
-- campos para quem nao e admin (admins e o dashboard continuam livres).
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_member_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.ativo := OLD.ativo;
    NEW.criado_em := OLD.criado_em;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.protect_member_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_member_fields ON members;
CREATE TRIGGER trg_protect_member_fields
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.protect_member_fields();

-- ============================================================
-- 5) CADASTRO NOVO ENTRA INATIVO
-- Qualquer pessoa com a anon key consegue chamar o signUp da API.
-- Antes isso criava um membro ATIVO com acesso a tudo. Agora o novo
-- cadastro entra INATIVO e so ve os dados depois que um admin ativa
-- (o formulario "Adicionar Membro" do admin ja ativa sozinho).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO members (id, nome, email, posicao, ativo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'posicao', 'LINHA'),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 6) STORAGE PRIVADO
-- Buckets publicos permitem que qualquer pessoa na internet abra os
-- arquivos pela URL, sem login. Fotos e comprovantes passam a ser
-- privados, servidos por URLs assinadas com validade de 1 hora, e o
-- upload so pode ir para a pasta do proprio usuario ({uid}/arquivo).
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'comprovantes';

-- Fotos: membros ativos veem; upload/troca so na propria pasta (ou admin)
DROP POLICY IF EXISTS "Avatar leitura publica" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Avatar leitura para membros" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload proprio ou admin" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update proprio ou admin" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete proprio ou admin" ON storage.objects;

CREATE POLICY "Avatar leitura para membros"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (public.is_active_member() OR public.is_admin()));

CREATE POLICY "Avatar upload proprio ou admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

CREATE POLICY "Avatar update proprio ou admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

CREATE POLICY "Avatar delete proprio ou admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- Comprovantes: cada um ve apenas o proprio; admin ve todos
DROP POLICY IF EXISTS "Comprovante leitura propria ou admin" ON storage.objects;
DROP POLICY IF EXISTS "Comprovante upload proprio" ON storage.objects;

CREATE POLICY "Comprovante leitura propria ou admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

CREATE POLICY "Comprovante upload proprio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ATENCAO: se o bucket "comprovantes" foi criado pelo dashboard com
-- policies proprias (nomes diferentes dos acima), revise em
-- Storage -> Policies e remova as permissivas que sobrarem.
