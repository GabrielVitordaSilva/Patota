import { supabase } from './supabaseClient'
import { storagePathFrom } from './storageUtils'

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

  // Upload da foto do card. O bucket "avatars" e privado: o arquivo vai
  // para a pasta do proprio membro e o banco guarda apenas o caminho.
  async uploadPhoto(memberId, file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${memberId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) return { error: uploadError }

    const { error } = await supabase.from('members').update({ foto_url: filePath }).eq('id', memberId)

    return { data: filePath, error }
  },

  // URLs assinadas (validas por 1h) para exibir as fotos do bucket privado
  async getPhotoUrls(members) {
    const entries = members
      .map((m) => ({ id: m.id, path: storagePathFrom(m.foto_url, 'avatars') }))
      .filter((entry) => entry.path)

    if (entries.length === 0) return {}

    const { data } = await supabase.storage.from('avatars').createSignedUrls(
      entries.map((entry) => entry.path),
      60 * 60
    )

    const urls = {}
    entries.forEach((entry, i) => {
      if (data?.[i]?.signedUrl) {
        urls[entry.id] = data[i].signedUrl
      }
    })

    return urls
  }
}
