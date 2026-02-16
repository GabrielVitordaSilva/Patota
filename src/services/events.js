import { supabase } from './supabaseClient'

const toUtcIsoIfNeeded = (dateTimeValue) => {
  if (typeof dateTimeValue !== 'string' || !dateTimeValue) {
    return dateTimeValue
  }

  // If it already has timezone info, keep it as provided.
  if (dateTimeValue.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTimeValue)) {
    return dateTimeValue
  }

  const parsed = new Date(dateTimeValue)
  if (Number.isNaN(parsed.getTime())) {
    return dateTimeValue
  }

  return parsed.toISOString()
}

export const eventService = {
  // Listar todos os eventos (futuros e passados)
  async getAllEvents() {
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
      .order('data_hora', { ascending: false })

    return { data, error }
  },

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
    const payload = { ...eventData }
    if (payload.data_hora) {
      payload.data_hora = toUtcIsoIfNeeded(payload.data_hora)
    }

    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single()
    
    return { data, error }
  },

  // Atualizar evento (Admin)
  async updateEvent(eventId, eventData) {
    const payload = { ...eventData }
    if (payload.data_hora) {
      payload.data_hora = toUtcIsoIfNeeded(payload.data_hora)
    }

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .select()
      .single()

    return { data, error }
  },

  // Excluir evento (Admin)
  async deleteEvent(eventId) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    return { error }
  },

  // Lancar/atualizar placar de jogo
  async updateEventScore(eventId, scoreData) {
    const { data, error } = await supabase
      .from('events')
      .update({
        time_a_nome: scoreData.time_a_nome,
        time_b_nome: scoreData.time_b_nome,
        time_a_placar: scoreData.time_a_placar,
        time_b_placar: scoreData.time_b_placar
      })
      .eq('id', eventId)
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
