-- Execute no SQL Editor do Supabase

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS placar_preto INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placar_branco INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placar_finalizado BOOLEAN DEFAULT false;

ALTER TABLE points_ledger
  ADD COLUMN IF NOT EXISTS gols INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time TEXT;

ALTER TABLE points_ledger
  DROP CONSTRAINT IF EXISTS points_ledger_motivo_check;

ALTER TABLE points_ledger
  ADD CONSTRAINT points_ledger_motivo_check
  CHECK (motivo IN ('GOLS_TIME', 'BONUS', 'PENALIDADE', 'PRESENCA_JOGO'));
