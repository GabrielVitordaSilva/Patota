import { supabase } from './supabaseClient'

export const configService = {
  async getPixKey() {
    const { data } = await supabase
      .from('config')
      .select('valor')
      .eq('chave', 'pix_key')
      .single()

    return data?.valor || 'Configure a chave PIX'
  },

  async setPixKey(pixKey) {
    const { error } = await supabase
      .from('config')
      .update({ valor: pixKey, atualizado_em: new Date().toISOString() })
      .eq('chave', 'pix_key')

    return { error }
  }
}
