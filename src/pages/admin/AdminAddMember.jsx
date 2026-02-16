import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { adminService } from '../../services/admin'

export default function AdminAddMember({ onSuccess }) {
  const { isAdmin } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isAdmin) {
      alert('Apenas admins podem adicionar membros.')
      return
    }

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedName || !normalizedEmail || password.length < 6) {
      alert('Preencha nome, email valido e senha com no minimo 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      const { error } = await adminService.addMember(normalizedName, normalizedEmail, password)

      if (error) throw error

      alert('Membro adicionado com sucesso!')
      resetForm()
      if (onSuccess) await onSuccess()
    } catch (error) {
      console.error('Erro ao adicionar membro:', error)
      if (String(error?.message || '').includes('Failed to send a request to the Edge Function')) {
        alert('Nao foi possivel acessar a Edge Function. Verifique se "admin-add-member" foi deployada no Supabase e tente novamente.')
      } else {
        alert(`Erro ao adicionar membro: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
      <h3 className="font-bold text-base md:text-lg mb-4">Adicionar Novo Membro</h3>

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
            placeholder="Minimo 6 caracteres"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !isAdmin}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Adicionando...' : 'Adicionar Membro'}
        </button>
      </form>
    </div>
  )
}
