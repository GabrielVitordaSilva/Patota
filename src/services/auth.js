import { supabase } from './supabaseClient'

export const authService = {
  // Login com email/senha
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    return { data, error }
  },

  // Registro de novo usuário
  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (!error && data.user) {
      // Criar registro na tabela members
      await supabase.from('members').insert({
        id: data.user.id,
        email: email,
        nome: name,
        ativo: true
      })
    }

    return { data, error }
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Obter usuário atual
  async getCurrentUser() {
    const {
      data: { user }
    } = await supabase.auth.getUser()
    return user
  },

  // Verificar se é admin
  async isAdmin(userId) {
    const { data, error } = await supabase
      .from('admins')
      .select('member_id')
      .eq('member_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return !!data
  },

  // Obter dados do membro
  async getMemberData(userId) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    return { data, error }
  },

  // Listener de mudanças de auth
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
