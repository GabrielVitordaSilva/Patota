import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminAddMember({ onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Criar usuário via admin
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { name: name }
      })

      if (error) throw error

      // Member será criado automaticamente pelo trigger
      alert('Membro adicionado com sucesso!')
      setName('')
      setEmail('')
      setPassword('')
      if (onSuccess) onSuccess()
      
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao adicionar membro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
      <h3 className="font-bold text-lg mb-4">Adicionar Novo Membro</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold"
        >
          {loading ? 'Adicionando...' : 'Adicionar Membro'}
        </button>
      </form>
    </div>
  )
}