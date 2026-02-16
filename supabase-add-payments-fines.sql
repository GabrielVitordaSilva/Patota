-- Executar no SQL Editor do Supabase

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS fine_id UUID REFERENCES fines(id) ON DELETE CASCADE;

ALTER TABLE payments
ALTER COLUMN due_id DROP NOT NULL;

ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payment_type_check;

ALTER TABLE payments
ADD CONSTRAINT payment_type_check
CHECK (
  (due_id IS NOT NULL AND fine_id IS NULL) OR
  (due_id IS NULL AND fine_id IS NOT NULL)
);