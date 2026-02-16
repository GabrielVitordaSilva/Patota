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
