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

  // Gerar times automaticamente, equilibrados pelo overall dos cards
  async generateTeams(eventId, adminId) {
    try {
      const { data: confirmados, error: confirmadosError } = await supabase
        .from('event_rsvp')
        .select(
          `
          member_id,
          members (nome, posicao)
        `
        )
        .eq('event_id', eventId)
        .eq('status', 'VOU')

      if (confirmadosError) return { error: confirmadosError.message }

      if (!confirmados || confirmados.length < 2) {
        return { error: 'Precisa de pelo menos 2 jogadores confirmados' }
      }

      // Overall de cada confirmado, calculado das avaliacoes dos cards
      const memberIds = confirmados.map((p) => p.member_id)
      const { data: ratings } = await supabase
        .from('player_ratings')
        .select('rated_member_id, ritmo, finalizacao, passe, drible, defesa, fisico')
        .in('rated_member_id', memberIds)

      const statKeys = ['ritmo', 'finalizacao', 'passe', 'drible', 'defesa', 'fisico']
      const overallDe = {}
      memberIds.forEach((id) => {
        const recebidas = ratings?.filter((r) => r.rated_member_id === id) || []
        if (recebidas.length === 0) {
          overallDe[id] = null
          return
        }
        const somaMedias = statKeys.reduce(
          (sum, key) => sum + recebidas.reduce((s, r) => s + r[key], 0) / recebidas.length,
          0
        )
        overallDe[id] = Math.round(somaMedias / statKeys.length)
      })

      // Quem ainda nao foi avaliado entra com a media do grupo, para nao desequilibrar
      const avaliados = Object.values(overallDe).filter((v) => v !== null)
      const mediaGrupo = avaliados.length ? avaliados.reduce((a, b) => a + b, 0) / avaliados.length : 70

      // "forca" leva uma pequena variacao aleatoria para os times mudarem a cada sorteio
      const jogadores = confirmados.map((p) => ({
        ...p,
        overall: overallDe[p.member_id] ?? Math.round(mediaGrupo),
        forca: (overallDe[p.member_id] ?? mediaGrupo) + (Math.random() * 6 - 3)
      }))

      const goleiros = jogadores
        .filter((p) => p.members?.posicao === 'GOLEIRO')
        .sort((a, b) => b.forca - a.forca)
      const linha = jogadores
        .filter((p) => p.members?.posicao !== 'GOLEIRO')
        .sort((a, b) => b.forca - a.forca)

      const timePreto = []
      const timeBranco = []
      let somaPreto = 0
      let somaBranco = 0
      const maxPorTime = Math.ceil(jogadores.length / 2)

      // Do mais forte ao mais fraco, cada um vai para o time com menor soma
      // de forca (respeitando o tamanho maximo). Goleiros primeiro, entao
      // cada time fica com o seu e o resto do elenco compensa a diferenca.
      const escolherTime = (p) => {
        const pretoCheio = timePreto.length >= maxPorTime
        const brancoCheio = timeBranco.length >= maxPorTime
        const vaiParaPreto = !pretoCheio && (brancoCheio || somaPreto <= somaBranco)

        if (vaiParaPreto) {
          timePreto.push(p)
          somaPreto += p.forca
        } else {
          timeBranco.push(p)
          somaBranco += p.forca
        }
      }

      goleiros.forEach(escolherTime)
      linha.forEach(escolherTime)

      const toJogador = (p) => ({
        member_id: p.member_id,
        nome: p.members?.nome || 'Jogador',
        posicao: p.members?.posicao === 'GOLEIRO' ? 'GOLEIRO' : 'LINHA',
        overall: p.overall
      })

      const mediaTime = (time) =>
        time.length ? Math.round((time.reduce((sum, p) => sum + p.overall, 0) / time.length) * 10) / 10 : 0

      const times = {
        preto: timePreto.map(toJogador),
        branco: timeBranco.map(toJogador),
        media_preto: mediaTime(timePreto),
        media_branco: mediaTime(timeBranco),
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
  // Cada jogador presente no evento ganha os gols que o time dele marcou
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

      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('member_id, status')
        .eq('event_id', eventId)

      const statusPorMembro = {}
      attendance?.forEach((a) => {
        statusPorMembro[a.member_id] = a.status
      })

      // Sem registro de presenca conta como presente (padrao da chamada)
      const estevePresente = (memberId) => {
        const status = statusPorMembro[memberId]
        return status !== 'AUSENTE' && status !== 'JUSTIFICADO'
      }

      const { error: updateError } = await supabase
        .from('events')
        .update({
          placar_preto: placarPreto,
          placar_branco: placarBranco,
          placar_finalizado: true
        })
        .eq('id', eventId)

      if (updateError) return { error: updateError.message }

      const lancamentos = [
        ...preto
          .filter((jogador) => estevePresente(jogador.member_id))
          .map((jogador) => ({
            member_id: jogador.member_id,
            event_id: eventId,
            pontos: placarPreto,
            gols: placarPreto,
            time: 'PRETO',
            motivo: 'GOLS_TIME'
          })),
        ...branco
          .filter((jogador) => estevePresente(jogador.member_id))
          .map((jogador) => ({
            member_id: jogador.member_id,
            event_id: eventId,
            pontos: placarBranco,
            gols: placarBranco,
            time: 'BRANCO',
            motivo: 'GOLS_TIME'
          }))
      ]

      if (lancamentos.length > 0) {
        const { error: pointsError } = await supabase.from('points_ledger').insert(lancamentos)
        if (pointsError) return { error: pointsError.message }
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
      texto += `${i + 1}. ${jogador.nome}${jogador.posicao === 'GOLEIRO' ? ' (Goleiro)' : ''}\n`
    })

    texto += '\nTIME BRANCO:\n'
    times.branco.forEach((jogador, i) => {
      texto += `${i + 1}. ${jogador.nome}${jogador.posicao === 'GOLEIRO' ? ' (Goleiro)' : ''}\n`
    })

    texto += `\nTotal: ${times.preto.length + times.branco.length} jogadores`

    return texto
  }
}
