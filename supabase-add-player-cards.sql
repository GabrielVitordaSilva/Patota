-- Execute no SQL Editor do Supabase
-- Cards dos jogadores estilo FIFA com avaliacoes entre os membros.
-- Os cards sao gerados automaticamente a partir da tabela members:
-- entrou membro novo na patota, o card dele aparece sozinho na pagina.

-- Foto do jogador exibida no card
ALTER TABLE members ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Avaliacoes: cada membro avalia os outros em 6 estatisticas (1 a 99)
CREATE TABLE IF NOT EXISTS player_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rated_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    rater_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    ritmo INTEGER NOT NULL CHECK (ritmo BETWEEN 1 AND 99),
    finalizacao INTEGER NOT NULL CHECK (finalizacao BETWEEN 1 AND 99),
    passe INTEGER NOT NULL CHECK (passe BETWEEN 1 AND 99),
    drible INTEGER NOT NULL CHECK (drible BETWEEN 1 AND 99),
    defesa INTEGER NOT NULL CHECK (defesa BETWEEN 1 AND 99),
    fisico INTEGER NOT NULL CHECK (fisico BETWEEN 1 AND 99),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rated_member_id, rater_member_id),
    CHECK (rated_member_id <> rater_member_id)
);

CREATE INDEX IF NOT EXISTS idx_player_ratings_rated ON player_ratings(rated_member_id);

ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'player_ratings'
      AND policyname = 'Todos podem ver avaliacoes'
  ) THEN
    CREATE POLICY "Todos podem ver avaliacoes"
      ON player_ratings FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'player_ratings'
      AND policyname = 'Membro cria propria avaliacao'
  ) THEN
    CREATE POLICY "Membro cria propria avaliacao"
      ON player_ratings FOR INSERT
      WITH CHECK (auth.uid() = rater_member_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'player_ratings'
      AND policyname = 'Membro atualiza propria avaliacao'
  ) THEN
    CREATE POLICY "Membro atualiza propria avaliacao"
      ON player_ratings FOR UPDATE
      USING (auth.uid() = rater_member_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'player_ratings'
      AND policyname = 'Membro exclui propria avaliacao'
  ) THEN
    CREATE POLICY "Membro exclui propria avaliacao"
      ON player_ratings FOR DELETE
      USING (auth.uid() = rater_member_id);
  END IF;
END $$;

-- Bucket PRIVADO para as fotos dos cards (as fotos sao servidas por
-- URLs assinadas; as policies de acesso estao em
-- supabase-security-hardening.sql, que deve ser executado tambem)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;
