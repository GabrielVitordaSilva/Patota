import { supabase } from './supabaseClient'

export const STAT_LABELS = [
  { key: 'ritmo', sigla: 'RIT', label: 'Ritmo' },
  { key: 'finalizacao', sigla: 'FIN', label: 'Finalizacao' },
  { key: 'passe', sigla: 'PAS', label: 'Passe' },
  { key: 'drible', sigla: 'DRI', label: 'Drible' },
  { key: 'defesa', sigla: 'DEF', label: 'Defesa' },
  { key: 'fisico', sigla: 'FIS', label: 'Fisico' }
]

export const cardsService = {
  // Membros ativos + todas as avaliacoes.
  // Os cards nascem do cadastro de membros: nao precisa configurar nada.
  async getPlayerCards() {
    const [membersResult, ratingsResult] = await Promise.all([
      supabase.from('members').select('id, nome, posicao, foto_url').eq('ativo', true).order('nome'),
      supabase.from('player_ratings').select('*')
    ])

    return {
      members: membersResult.data || [],
      ratings: ratingsResult.data || [],
      error: membersResult.error || ratingsResult.error
    }
  },

  // Criar ou atualizar a minha avaliacao de um jogador
  async rateMember(raterId, ratedId, stats) {
    const { data, error } = await supabase
      .from('player_ratings')
      .upsert(
        {
          rated_member_id: ratedId,
          rater_member_id: raterId,
          ...stats,
          atualizado_em: new Date().toISOString()
        },
        { onConflict: 'rated_member_id,rater_member_id' }
      )

    return { data, error }
  },

  // Upload da foto do card (bucket publico "avatars")
  async uploadPhoto(memberId, file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${memberId}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) return { error: uploadError }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const { error } = await supabase.from('members').update({ foto_url: urlData.publicUrl }).eq('id', memberId)

    return { data: urlData.publicUrl, error }
  }
}
