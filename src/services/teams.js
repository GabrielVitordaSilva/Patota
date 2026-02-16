import { supabase } from './supabaseClient'

export const teamsService = {
  // Verificar se confirmacoes estao abertas
  async isConfirmationOpen(eventId) {
    const { data } = await supabase
      .from('events')
      .select('data_limite_confirmacao, times_gerados')
      .eq('id', eventId)
      .single()

    if (!data) return false

    if (data.times_gerados) return false
    if (!data.data_limite_confirmacao) return true

    const now = new Date()
    const limite = new Date(data.data_limite_confirmacao)
    return now < limite
  },

  // Gerar times automaticamente
  async generateTeams(eventId, adminId) {
    try {
      const { data: confirmados, error: confirmadosError } = await supabase
        .from('event_rsvp')
        .select(
          `
          member_id,
          members (nome)
        `
        )
        .eq('event_id', eventId)
        .eq('status', 'VOU')

      if (confirmadosError) return { error: confirmadosError.message }

      if (!confirmados || confirmados.length < 2) {
        return { error: 'Precisa de pelo menos 2 jogadores confirmados' }
      }

      const shuffled = [...confirmados].sort(() => Math.random() - 0.5)
      const meio = Math.ceil(shuffled.length / 2)
      const timePreto = shuffled.slice(0, meio)
      const timeBranco = shuffled.slice(meio)

      const times = {
        preto: timePreto.map((p) => ({
          member_id: p.member_id,
          nome: p.members?.nome || 'Jogador'
        })),
        branco: timeBranco.map((p) => ({
          member_id: p.member_id,
          nome: p.members?.nome || 'Jogador'
        })),
        gerado_em: new Date().toISOString(),
        gerado_por: adminId
      }

      const { error } = await supabase
        .from('events')
        .update({
          times_json: times,
          times_gerados: true
        })
        .eq('id', eventId)

      if (error) return { error: error.message }

      return { data: times, error: null }
    } catch (err) {
      return { error: err.message }
    }
  },

  // Buscar times gerados
  async getTeams(eventId) {
    const { data } = await supabase
      .from('events')
      .select('times_json, times_gerados, data_hora, local')
      .eq('id', eventId)
      .single()

    return data
  },

  // Resetar times (admin)
  async resetTeams(eventId) {
    const reopenUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('events')
      .update({
        times_json: null,
        times_gerados: false,
        data_limite_confirmacao: reopenUntil
      })
      .eq('id', eventId)

    return { error }
  },

  // Registrar placar e distribuir pontos por gols do time
  async registerScore(eventId, placarPreto, placarBranco, adminId) {
    try {
      void adminId
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('times_json, times_gerados')
        .eq('id', eventId)
        .single()

      if (eventError) return { error: eventError.message }
      if (!event || !event.times_gerados) {
        return { error: 'Times nao foram gerados ainda' }
      }

      const times = event.times_json || {}
      const preto = Array.isArray(times.preto) ? times.preto : []
      const branco = Array.isArray(times.branco) ? times.branco : []

      const { error: updateError } = await supabase
        .from('events')
        .update({
          placar_preto: placarPreto,
          placar_branco: placarBranco,
          placar_finalizado: true
        })
        .eq('id', eventId)

      if (updateError) return { error: updateError.message }

      for (const jogador of preto) {
        await supabase.from('points_ledger').insert({
          member_id: jogador.member_id,
          event_id: eventId,
          pontos: placarPreto,
          gols: placarPreto,
          time: 'PRETO',
          motivo: 'GOLS_TIME'
        })
      }

      for (const jogador of branco) {
        await supabase.from('points_ledger').insert({
          member_id: jogador.member_id,
          event_id: eventId,
          pontos: placarBranco,
          gols: placarBranco,
          time: 'BRANCO',
          motivo: 'GOLS_TIME'
        })
      }

      return {
        data: {
          placar_preto: placarPreto,
          placar_branco: placarBranco,
          vencedor: placarPreto > placarBranco ? 'PRETO' : placarBranco > placarPreto ? 'BRANCO' : 'EMPATE'
        },
        error: null
      }
    } catch (err) {
      return { error: err.message }
    }
  },

  // Editar placar removendo e recalculando pontos do evento
  async editScore(eventId, placarPreto, placarBranco, adminId) {
    try {
      void adminId
      await supabase
        .from('points_ledger')
        .delete()
        .eq('event_id', eventId)
        .eq('motivo', 'GOLS_TIME')

      await supabase
        .from('events')
        .update({
          placar_preto: 0,
          placar_branco: 0,
          placar_finalizado: false
        })
        .eq('id', eventId)

      return await this.registerScore(eventId, placarPreto, placarBranco, adminId)
    } catch (err) {
      return { error: err.message }
    }
  },

  // Buscar placar do jogo
  async getScore(eventId) {
    const { data } = await supabase
      .from('events')
      .select('placar_preto, placar_branco, placar_finalizado, times_json')
      .eq('id', eventId)
      .single()

    return data
  },

  // Texto para WhatsApp
  generateWhatsAppText(event, times) {
    const data = new Date(event.data_hora).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    })
    const hora = new Date(event.data_hora).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })

    let texto = 'TIMES DO JOGO\n\n'
    texto += `${data}\n`
    texto += `${hora}\n`
    texto += `${event.local}\n\n`

    texto += 'TIME PRETO:\n'
    times.preto.forEach((jogador, i) => {
      texto += `${i + 1}. ${jogador.nome}\n`
    })

    texto += '\nTIME BRANCO:\n'
    times.branco.forEach((jogador, i) => {
      texto += `${i + 1}. ${jogador.nome}\n`
    })

    texto += `\nTotal: ${times.preto.length + times.branco.length} jogadores`

    return texto
  }
}
