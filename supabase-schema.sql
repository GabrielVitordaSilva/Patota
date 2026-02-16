-- ============================================
-- PATOTA CCC - Database Schema
-- ============================================

-- Criar tabela de membros
CREATE TABLE members (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de admins
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id)
);

-- Criar tabela de eventos
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('JOGO', 'INTERNO')),
    data_hora TIMESTAMPTZ NOT NULL,
    local TEXT NOT NULL,
    time_a_nome TEXT,
    time_b_nome TEXT,
    time_a_placar INTEGER CHECK (time_a_placar >= 0),
    time_b_placar INTEGER CHECK (time_b_placar >= 0),
    criado_por UUID REFERENCES members(id),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de RSVP (confirmações)
CREATE TABLE event_rsvp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('VOU', 'NAO_VOU', 'TALVEZ')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

-- Criar tabela de presença real
CREATE TABLE event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('PRESENTE', 'AUSENTE', 'ATRASO', 'JUSTIFICADO')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

-- Criar tabela de mensalidades
CREATE TABLE dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL, -- YYYY-MM
    vencimento DATE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'PAGO', 'ISENTO')) DEFAULT 'PENDENTE',
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, competencia)
);

-- Criar tabela de isenções
CREATE TABLE exemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL, -- YYYY-MM
    motivo TEXT NOT NULL CHECK (motivo IN ('LESAO', 'TRABALHO')),
    aprovado_por UUID REFERENCES members(id),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, competencia)
);

-- Criar tabela de multas
CREATE TABLE fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ATRASO', 'FALTA_CONFIRMADA', 'CONVIDADO')),
    valor DECIMAL(10,2) NOT NULL,
    obs TEXT,
    pago BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de lançamentos do caixa
CREATE TABLE cash_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    categoria TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    referencia TEXT, -- fine_id, due_id, payment_id, etc
    obs TEXT,
    lancado_por UUID REFERENCES members(id),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de pagamentos
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    due_id UUID REFERENCES dues(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'CONFIRMADO')) DEFAULT 'PENDENTE',
    comprovante_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de pontos
CREATE TABLE points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    pontos INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de logs de auditoria (opcional mas recomendado)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    member_id UUID REFERENCES members(id),
    details JSONB,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CRIAR STORAGE BUCKET PARA COMPROVANTES
-- ============================================
-- Execute no Supabase Dashboard -> Storage
-- Criar bucket "comprovantes" com acesso público

-- ============================================
-- RLS (Row Level Security) POLICIES
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- MEMBERS: Todos podem ver, apenas o próprio pode atualizar
CREATE POLICY "Todos podem ver membros"
    ON members FOR SELECT
    USING (true);

CREATE POLICY "Membro pode atualizar próprio perfil"
    ON members FOR UPDATE
    USING (auth.uid() = id);

-- ADMINS: Apenas admins podem ver e modificar
CREATE POLICY "Apenas admins podem ver admins"
    ON admins FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- EVENTS: Todos podem ver, apenas admins podem criar/editar
CREATE POLICY "Todos podem ver eventos"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Apenas admins podem criar eventos"
    ON events FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

CREATE POLICY "Apenas admins podem atualizar eventos"
    ON events FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

CREATE POLICY "Apenas admins podem excluir eventos"
    ON events FOR DELETE
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- EVENT_RSVP: Todos podem ver, apenas o próprio pode criar/editar
CREATE POLICY "Todos podem ver RSVP"
    ON event_rsvp FOR SELECT
    USING (true);

CREATE POLICY "Membros podem criar próprio RSVP"
    ON event_rsvp FOR INSERT
    WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Membros podem atualizar próprio RSVP"
    ON event_rsvp FOR UPDATE
    USING (auth.uid() = member_id);

-- EVENT_ATTENDANCE: Todos podem ver, apenas admins podem criar/editar
CREATE POLICY "Todos podem ver presença"
    ON event_attendance FOR SELECT
    USING (true);

CREATE POLICY "Apenas admins podem marcar presença"
    ON event_attendance FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- DUES: Apenas o próprio pode ver suas mensalidades, admins veem tudo
CREATE POLICY "Membros veem próprias mensalidades"
    ON dues FOR SELECT
    USING (
        auth.uid() = member_id 
        OR EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid())
    );

CREATE POLICY "Apenas admins podem criar mensalidades"
    ON dues FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

CREATE POLICY "Apenas admins podem atualizar mensalidades"
    ON dues FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- FINES: Apenas o próprio pode ver suas multas, admins veem tudo
CREATE POLICY "Membros veem próprias multas"
    ON fines FOR SELECT
    USING (
        auth.uid() = member_id 
        OR EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid())
    );

CREATE POLICY "Apenas admins podem criar multas"
    ON fines FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- CASH_LEDGER: Apenas admins podem ver e modificar
CREATE POLICY "Apenas admins podem ver caixa"
    ON cash_ledger FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

CREATE POLICY "Apenas admins podem lançar no caixa"
    ON cash_ledger FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- PAYMENTS: Próprio membro pode ver e criar, admins podem tudo
CREATE POLICY "Membros veem próprios pagamentos"
    ON payments FOR SELECT
    USING (
        auth.uid() = member_id 
        OR EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid())
    );

CREATE POLICY "Membros podem criar próprios pagamentos"
    ON payments FOR INSERT
    WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Apenas admins podem confirmar pagamentos"
    ON payments FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- POINTS_LEDGER: Todos podem ver, apenas admins podem modificar
CREATE POLICY "Todos podem ver pontos"
    ON points_ledger FOR SELECT
    USING (true);

CREATE POLICY "Apenas admins podem lançar pontos"
    ON points_ledger FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- EXEMPTIONS: Apenas admins
CREATE POLICY "Apenas admins podem ver isenções"
    ON exemptions FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- AUDIT_LOGS: Apenas admins
CREATE POLICY "Apenas admins podem ver logs"
    ON audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE member_id = auth.uid()));

-- ============================================
-- FUNCTIONS & TRIGGERS ÚTEIS
-- ============================================

-- Trigger para criar member automaticamente quando user é criado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO members (id, nome, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_events_data_hora ON events(data_hora);
CREATE INDEX idx_dues_member_competencia ON dues(member_id, competencia);
CREATE INDEX idx_fines_member ON fines(member_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_cash_ledger_criado_em ON cash_ledger(criado_em);
CREATE INDEX idx_points_member ON points_ledger(member_id);

-- ============================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================

-- Depois de criar o primeiro usuário via interface, execute:
-- INSERT INTO admins (member_id) VALUES ('UUID-DO-PRIMEIRO-USUARIO');
