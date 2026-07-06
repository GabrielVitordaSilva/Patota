-- Execute no SQL Editor do Supabase
-- A pontuacao do ranking agora e definida apenas pelos gols do time no jogo
-- (jogador presente ganha os gols que o time dele marcou).
-- Remove os pontos antigos de +1 por presenca e tira o motivo da lista permitida.

DELETE FROM points_ledger WHERE motivo = 'PRESENCA_JOGO';

ALTER TABLE points_ledger
  DROP CONSTRAINT IF EXISTS points_ledger_motivo_check;

ALTER TABLE points_ledger
  ADD CONSTRAINT points_ledger_motivo_check
  CHECK (motivo IN ('GOLS_TIME', 'BONUS', 'PENALIDADE'));
