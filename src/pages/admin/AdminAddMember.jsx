import { useState } from 'react'
import { authService } from '../../services/auth'

export default function AdminAddMember({ onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const normalizedName = name.trim()
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()

      const { error } = await authService.signUp(normalizedEmail, normalizedPassword, normalizedName)

      if (error) {
        alert('Erro ao adicionar membro: ' + error.message)
      } else {
        alert('Membro adicionado com sucesso!')
        setName('')
        setEmail('')
        setPassword('')
        if (onSuccess) onSuccess()
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao adicionar membro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ui-card ui-card-body mb-4">
      <h3 className="ui-title mb-4">Adicionar Novo Membro</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ui-input"
            placeholder="Nome completo"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ui-input"
            placeholder="email@exemplo.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ui-input"
            placeholder="Minimo 6 caracteres"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full ui-btn-primary"
        >
          {loading ? 'Adicionando...' : 'Adicionar Membro'}
        </button>
      </form>
    </div>
  )
}
