-- Executar no Supabase SQL Editor para habilitar configuracao da chave PIX
CREATE TABLE IF NOT EXISTS config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'config'
      AND policyname = 'Todos podem ler config'
  ) THEN
    CREATE POLICY "Todos podem ler config"
      ON config FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'config'
      AND policyname = 'Apenas admins podem atualizar config'
  ) THEN
    CREATE POLICY "Apenas admins podem atualizar config"
      ON config FOR UPDATE
      USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));
  END IF;
END $$;

INSERT INTO config (chave, valor)
VALUES ('pix_key', 'seupix@exemplo.com')
ON CONFLICT (chave) DO NOTHING;