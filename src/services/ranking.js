import { supabase } from './supabaseClient'

export const rankingService = {
  // Obter ranking geral
  async getGeneralRanking() {
    const { data, error } = await supabase
      .from('points_ledger')
      .select(`
        member_id,
        pontos,
        members (nome)
      `)
    
    if (error) return { data: [], error }
    
    // Agrupar por membro e somar pontos
    const ranking = {}
    data?.forEach(entry => {
      if (!ranking[entry.member_id]) {
        ranking[entry.member_id] = {
          member_id: entry.member_id,
          nome: entry.members.nome,
          pontos: 0
        }
      }
      ranking[entry.member_id].pontos += entry.pontos
    })
    
    // Converter para array e ordenar
    const rankingArray = Object.values(ranking)
      .sort((a, b) => b.pontos - a.pontos)
    
    return { data: rankingArray, error: null }
  },

  // Obter ranking mensal
  async getMonthlyRanking(year, month) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const { data, error } = await supabase
      .from('points_ledger')
      .select(`
        member_id,
        pontos,
        members (nome)
      `)
      .gte('criado_em', startDate.toISOString())
      .lte('criado_em', endDate.toISOString())
    
    if (error) return { data: [], error }
    
    // Agrupar por membro e somar pontos
    const ranking = {}
    data?.forEach(entry => {
      if (!ranking[entry.member_id]) {
        ranking[entry.member_id] = {
          member_id: entry.member_id,
          nome: entry.members.nome,
          pontos: 0
        }
      }
      ranking[entry.member_id].pontos += entry.pontos
    })
    
    // Converter para array e ordenar
    const rankingArray = Object.values(ranking)
      .sort((a, b) => b.pontos - a.pontos)
    
    return { data: rankingArray, error: null }
  },

  // Obter estatísticas do usuário
  async getUserStats(memberId) {
    // Buscar todos os pontos
    const { data: points } = await supabase
      .from('points_ledger')
      .select('pontos, criado_em')
      .eq('member_id', memberId)
    
    const totalPoints = points?.reduce((sum, p) => sum + p.pontos, 0) || 0
    
    // Buscar presenças
    const { data: attendances } = await supabase
      .from('event_attendance')
      .select('status')
      .eq('member_id', memberId)
    
    const presents = attendances?.filter(a => a.status === 'PRESENTE').length || 0
    const absences = attendances?.filter(a => a.status === 'AUSENTE').length || 0
    const delays = attendances?.filter(a => a.status === 'ATRASO').length || 0
    
    return {
      totalPoints,
      presents,
      absences,
      delays,
      attendanceRate: attendances?.length > 0 
        ? ((presents / attendances.length) * 100).toFixed(1)
        : 0
    }
  }
}
