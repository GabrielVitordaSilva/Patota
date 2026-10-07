import { supabase } from './supabaseClient'

export const notificationService = {
  // Ultimas notificacoes do proprio membro (a policy do banco ja filtra)
  async list(limit = 30) {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, tipo, titulo, mensagem, link, lida, criado_em')
      .order('criado_em', { ascending: false })
      .limit(limit)

    return { data: data || [], error }
  },

  async markRead(id) {
    const { error } = await supabase.from('notifications').update({ lida: true }).eq('id', id)
    return { error }
  },

  async markAllRead() {
    const { error } = await supabase.from('notifications').update({ lida: true }).eq('lida', false)
    return { error }
  },

  async clearAll() {
    // Nao existe filtro "todas": apaga as do proprio membro (a policy limita ao dono)
    const { error } = await supabase.from('notifications').delete().not('id', 'is', null)
    return { error }
  }
}
