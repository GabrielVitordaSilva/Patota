import { supabase } from './supabaseClient'

export const authService = {
  // Login com email/senha
  async signIn(email, password) {
  console.log('🔐 Tentando login...')
  console.log('📧 Email:', email)
  console.log('🔑 Tem senha?', !!password)
  console.log('🌐 URL:', import.meta.env.VITE_SUPABASE_URL)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  console.log('✅ Data:', data)
  console.log('❌ Error:', error)
  
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
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Verificar se é admin
  async isAdmin(userId) {
    const { data } = await supabase
      .from('admins')
      .select('member_id')
      .eq('member_id', userId)
      .single()
    
    return !!data
  },

  // Obter dados do membro
  async getMemberData(userId) {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .single()
    
    return data
  },

  // Listener de mudanças de auth
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
