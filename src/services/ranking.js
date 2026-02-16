import { supabase } from './supabaseClient'

export const rankingService = {
  // Obter ranking geral
  async getGeneralRanking() {
    const { data, error } = await supabase
      .from('points_ledger')
      .select(
        `
        member_id,
        pontos,
        gols,
        members (nome)
      `
      )

    if (error) return { data: [], error }

    const ranking = {}
    data?.forEach((entry) => {
      if (!ranking[entry.member_id]) {
        ranking[entry.member_id] = {
          member_id: entry.member_id,
          nome: entry.members.nome,
          pontos: 0,
          totalGols: 0
        }
      }
      ranking[entry.member_id].pontos += entry.pontos
      ranking[entry.member_id].totalGols += entry.gols || 0
    })

    const rankingArray = Object.values(ranking).sort((a, b) => b.pontos - a.pontos)
    return { data: rankingArray, error: null }
  },

  // Obter ranking mensal
  async getMonthlyRanking(year, month) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const { data, error } = await supabase
      .from('points_ledger')
      .select(
        `
        member_id,
        pontos,
        gols,
        members (nome)
      `
      )
      .gte('criado_em', startDate.toISOString())
      .lte('criado_em', endDate.toISOString())

    if (error) return { data: [], error }

    const ranking = {}
    data?.forEach((entry) => {
      if (!ranking[entry.member_id]) {
        ranking[entry.member_id] = {
          member_id: entry.member_id,
          nome: entry.members.nome,
          pontos: 0,
          totalGols: 0
        }
      }
      ranking[entry.member_id].pontos += entry.pontos
      ranking[entry.member_id].totalGols += entry.gols || 0
    })

    const rankingArray = Object.values(ranking).sort((a, b) => b.pontos - a.pontos)
    return { data: rankingArray, error: null }
  },

  // Obter estatisticas detalhadas do usuario
  async getUserStats(memberId) {
    const { data: points } = await supabase
      .from('points_ledger')
      .select(
        `
        pontos,
        gols,
        time,
        motivo,
        criado_em,
        events (
          data_hora,
          local,
          placar_preto,
          placar_branco
        )
      `
      )
      .eq('member_id', memberId)
      .order('criado_em', { ascending: false })

    const totalPoints = points?.reduce((sum, p) => sum + p.pontos, 0) || 0
    const totalGols = points?.reduce((sum, p) => sum + (p.gols || 0), 0) || 0

    let vitorias = 0
    let derrotas = 0
    let empates = 0

    points?.forEach((p) => {
      if (p.events && p.time) {
        const meusPontos = p.time === 'PRETO' ? p.events.placar_preto : p.events.placar_branco
        const adversario = p.time === 'PRETO' ? p.events.placar_branco : p.events.placar_preto

        if (meusPontos > adversario) vitorias += 1
        else if (meusPontos < adversario) derrotas += 1
        else empates += 1
      }
    })

    const { data: attendances } = await supabase.from('event_attendance').select('status').eq('member_id', memberId)

    const presents = attendances?.filter((a) => a.status === 'PRESENTE').length || 0
    const absences = attendances?.filter((a) => a.status === 'AUSENTE').length || 0
    const delays = attendances?.filter((a) => a.status === 'ATRASO').length || 0
    const jogos = vitorias + derrotas + empates

    return {
      totalPoints,
      totalGols,
      vitorias,
      derrotas,
      empates,
      jogos,
      presents,
      absences,
      delays,
      attendanceRate: attendances?.length > 0 ? ((presents / attendances.length) * 100).toFixed(1) : 0,
      mediaGolsPorJogo: jogos > 0 ? (totalGols / jogos).toFixed(1) : 0,
      aproveitamento: jogos > 0 ? ((vitorias / jogos) * 100).toFixed(1) : 0
    }
  }
}
