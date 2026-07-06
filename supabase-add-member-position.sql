-- Execute no SQL Editor do Supabase
-- Adiciona a posicao do jogador (GOLEIRO ou LINHA) no cadastro de membros

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS posicao TEXT NOT NULL DEFAULT 'LINHA';

ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_posicao_check;

ALTER TABLE members
  ADD CONSTRAINT members_posicao_check
  CHECK (posicao IN ('GOLEIRO', 'LINHA'));

-- Atualiza o trigger de novo usuario para gravar a posicao escolhida no cadastro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO members (id, nome, email, posicao)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'posicao', 'LINHA')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
