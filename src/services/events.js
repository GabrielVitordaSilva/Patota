import { supabase } from './supabaseClient'

export const eventService = {
  // Listar eventos futuros
  async getUpcomingEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_rsvp (
          member_id,
          status,
          members (nome)
        ),
        event_attendance (
          member_id,
          status,
          members (nome)
        )
      `)
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true })
    
    return { data, error }
  },

  // Obter próximo evento
  async getNextEvent() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_rsvp (
          member_id,
          status,
          members (nome)
        )
      `)
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true })
      .limit(1)
      .single()
    
    return { data, error }
  },

  // Confirmar presença (RSVP)
  async confirmPresence(eventId, memberId, status) {
    const { data, error } = await supabase
      .from('event_rsvp')
      .upsert({
        event_id: eventId,
        member_id: memberId,
        status: status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_id,member_id'
      })
    
    return { data, error }
  },

  // Obter RSVP do usuário
  async getUserRSVP(eventId, memberId) {
    const { data, error } = await supabase
      .from('event_rsvp')
      .select('status')
      .eq('event_id', eventId)
      .eq('member_id', memberId)
      .single()
    
    return { data, error }
  },

  // Criar evento (Admin)
  async createEvent(eventData) {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()
    
    return { data, error }
  },

  // Marcar presença real (Admin)
  async markAttendance(eventId, memberId, status) {
    const { data, error } = await supabase
      .from('event_attendance')
      .upsert({
        event_id: eventId,
        member_id: memberId,
        status: status
      }, {
        onConflict: 'event_id,member_id'
      })
    
    // Aplicar regras automáticas de multas
    if (status === 'ATRASO') {
      await this.createFine(memberId, eventId, 'ATRASO', 5)
    } else if (status === 'AUSENTE') {
      // Verificar se tinha confirmado presença
      const { data: rsvp } = await supabase
        .from('event_rsvp')
        .select('status')
        .eq('event_id', eventId)
        .eq('member_id', memberId)
        .single()
      
      if (rsvp && rsvp.status === 'VOU') {
        await this.createFine(memberId, eventId, 'FALTA_CONFIRMADA', 10)
      }
    }
    
    // Se presente em jogo, adicionar ponto
    if (status === 'PRESENTE') {
      const { data: event } = await supabase
        .from('events')
        .select('tipo')
        .eq('id', eventId)
        .single()
      
      if (event && event.tipo === 'JOGO') {
        await supabase.from('points_ledger').insert({
          member_id: memberId,
          event_id: eventId,
          pontos: 1,
          motivo: 'PRESENCA_JOGO'
        })
      }
    }
    
    return { data, error }
  },

  // Criar multa e lançar no caixa
  async createFine(memberId, eventId, tipo, valor) {
    // Criar multa
    const { data: fine } = await supabase
      .from('fines')
      .insert({
        member_id: memberId,
        event_id: eventId,
        tipo: tipo,
        valor: valor
      })
      .select()
      .single()
    
    // Lançar no caixa
    if (fine) {
      await supabase.from('cash_ledger').insert({
        tipo: 'ENTRADA',
        categoria: 'MULTA',
        valor: valor,
        referencia: `fine_${fine.id}`,
        lancado_por: memberId
      })
    }
    
    return fine
  },

  // Adicionar convidado
  async addGuest(eventId, memberId, quantidade) {
    const valor = quantidade * 5
    
    // Criar multa de convidado
    const { data: fine } = await supabase
      .from('fines')
      .insert({
        member_id: memberId,
        event_id: eventId,
        tipo: 'CONVIDADO',
        valor: valor,
        obs: `${quantidade} convidado(s)`
      })
      .select()
      .single()
    
    // Lançar no caixa
    if (fine) {
      await supabase.from('cash_ledger').insert({
        tipo: 'ENTRADA',
        categoria: 'CONVIDADO',
        valor: valor,
        referencia: `fine_${fine.id}`,
        lancado_por: memberId
      })
    }
    
    return fine
  }
}
