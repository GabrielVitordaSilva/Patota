-- Executar no Supabase SQL Editor para habilitar placar e historico de eventos
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS time_a_nome TEXT,
  ADD COLUMN IF NOT EXISTS time_b_nome TEXT,
  ADD COLUMN IF NOT EXISTS time_a_placar INTEGER,
  ADD COLUMN IF NOT EXISTS time_b_placar INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_time_a_placar_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_time_a_placar_check CHECK (time_a_placar IS NULL OR time_a_placar >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_time_b_placar_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_time_b_placar_check CHECK (time_b_placar IS NULL OR time_b_placar >= 0);
  END IF;
END $$;