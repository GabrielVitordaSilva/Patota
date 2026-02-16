import { supabase } from './supabaseClient'

export const adminService = {
  // Criar membro via Edge Function (somente admin)
  async addMember(name, email, password) {
    const { data, error } = await supabase.functions.invoke('admin-add-member', {
      body: { name, email, password }
    })

    return { data, error }
  },

  // Listar todos os membros
  async getAllMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('nome', { ascending: true })
    
    return { data, error }
  },

  // Ativar/desativar membro
  async toggleMemberStatus(memberId, ativo) {
    const { data, error } = await supabase
      .from('members')
      .update({ ativo: ativo })
      .eq('id', memberId)
      .select()
      .single()
    
    return { data, error }
  },

  // Listar pagamentos pendentes
  async getPendingPayments() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        members (nome, email),
        dues (competencia, valor)
      `)
      .eq('status', 'PENDENTE')
      .order('criado_em', { ascending: true })
    
    return { data, error }
  },

  // Obter relatório mensal
  async getMonthlyReport(year, month) {
    const competencia = `${year}-${String(month).padStart(2, '0')}`
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    // Mensalidades
    const { data: dues } = await supabase
      .from('dues')
      .select('status, valor')
      .eq('competencia', competencia)
    
    const duesReport = {
      total: dues?.length || 0,
      pago: dues?.filter(d => d.status === 'PAGO').length || 0,
      pendente: dues?.filter(d => d.status === 'PENDENTE').length || 0,
      isento: dues?.filter(d => d.status === 'ISENTO').length || 0,
      valorTotal: dues?.reduce((sum, d) => sum + d.valor, 0) || 0,
      valorPago: dues?.filter(d => d.status === 'PAGO').reduce((sum, d) => sum + d.valor, 0) || 0
    }
    
    // Movimentação do caixa
    const { data: cashLedger } = await supabase
      .from('cash_ledger')
      .select('tipo, categoria, valor')
      .gte('criado_em', startDate.toISOString())
      .lte('criado_em', endDate.toISOString())
    
    const entradas = cashLedger?.filter(c => c.tipo === 'ENTRADA').reduce((sum, c) => sum + c.valor, 0) || 0
    const saidas = cashLedger?.filter(c => c.tipo === 'SAIDA').reduce((sum, c) => sum + c.valor, 0) || 0
    
    // Multas
    const { data: fines } = await supabase
      .from('fines')
      .select('tipo, valor')
      .gte('criado_em', startDate.toISOString())
      .lte('criado_em', endDate.toISOString())
    
    const finesReport = {
      total: fines?.length || 0,
      valorTotal: fines?.reduce((sum, f) => sum + f.valor, 0) || 0,
      atraso: fines?.filter(f => f.tipo === 'ATRASO').length || 0,
      falta: fines?.filter(f => f.tipo === 'FALTA_CONFIRMADA').length || 0,
      convidado: fines?.filter(f => f.tipo === 'CONVIDADO').length || 0
    }
    
    // Eventos
    const { data: events } = await supabase
      .from('events')
      .select(`
        id,
        tipo,
        event_attendance (member_id)
      `)
      .gte('data_hora', startDate.toISOString())
      .lte('data_hora', endDate.toISOString())
    
    const eventsReport = {
      total: events?.length || 0,
      jogos: events?.filter(e => e.tipo === 'JOGO').length || 0,
      internos: events?.filter(e => e.tipo === 'INTERNO').length || 0
    }
    
    return {
      competencia,
      dues: duesReport,
      cash: { entradas, saidas, saldo: entradas - saidas },
      fines: finesReport,
      events: eventsReport
    }
  },

  // Obter evento com detalhes para admin
  async getEventDetails(eventId) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_rsvp (
          member_id,
          status,
          updated_at,
          members (nome, email)
        ),
        event_attendance (
          member_id,
          status,
          members (nome, email)
        )
      `)
      .eq('id', eventId)
      .single()
    
    return { data, error }
  },

  // Fechar lista (enviar notificação para quem não confirmou)
  async closeEventList(eventId) {
    // Buscar membros ativos
    const { data: members } = await supabase
      .from('members')
      .select('id, nome, email')
      .eq('ativo', true)
    
    // Buscar quem já confirmou
    const { data: rsvps } = await supabase
      .from('event_rsvp')
      .select('member_id')
      .eq('event_id', eventId)
    
    const confirmedIds = rsvps?.map(r => r.member_id) || []
    const pendingMembers = members?.filter(m => !confirmedIds.includes(m.id)) || []
    
    // Aqui você pode implementar envio de notificações
    // Por enquanto, apenas retorna a lista de pendentes
    return { pendingMembers }
  },

  // Criar log de auditoria
  async createAuditLog(action, memberId, details) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        action: action,
        member_id: memberId,
        details: details
      })
    
    return { data, error }
  }
}
