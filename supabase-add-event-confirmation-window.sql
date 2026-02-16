-- Execute no SQL Editor do Supabase

ALTER TABLE events
ADD COLUMN IF NOT EXISTS data_limite_confirmacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS times_gerados BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS times_json JSONB;

CREATE INDEX IF NOT EXISTS idx_events_limite_confirmacao ON events(data_limite_confirmacao);

CREATE OR REPLACE FUNCTION calcular_data_limite(data_jogo TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  dia_semana INTEGER;
  data_limite TIMESTAMPTZ;
BEGIN
  dia_semana := EXTRACT(DOW FROM data_jogo);

  IF dia_semana = 6 THEN
    data_limite := (data_jogo - INTERVAL '1 day')::date + TIME '18:00:00';
  ELSE
    data_limite := data_jogo - INTERVAL '24 hours';
  END IF;

  RETURN data_limite;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_data_limite_confirmacao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'JOGO' AND (
    NEW.data_limite_confirmacao IS NULL OR
    (
      TG_OP = 'UPDATE'
      AND NEW.data_hora IS DISTINCT FROM OLD.data_hora
      AND NEW.data_limite_confirmacao IS NOT DISTINCT FROM OLD.data_limite_confirmacao
    )
  ) THEN
    NEW.data_limite_confirmacao := calcular_data_limite(NEW.data_hora);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_data_limite ON events;

CREATE TRIGGER trigger_set_data_limite
  BEFORE INSERT OR UPDATE OF data_hora
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_data_limite_confirmacao();
