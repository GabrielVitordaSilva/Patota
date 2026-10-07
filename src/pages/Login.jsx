import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../components/Layout'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        setError('Email ou senha inválidos')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-6 text-base font-bold" style={{ color: 'var(--ink)' }}><Logo />Patota CCC</div>
        <form onSubmit={handleSubmit} className="ui-card p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Entrar</h1>
            <p className="mt-1 text-xs text-slate-500">Use o e-mail cadastrado pela diretoria.</p>
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ui-input" placeholder="seu@email.com" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">Senha</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="ui-input" placeholder="••••••••" required />
          </div>
          {error && <div role="alert" className="bg-red-50 border border-red-300 text-red-800 px-3 py-2 rounded-lg text-xs">{error}</div>}
          <button type="submit" disabled={loading} className="w-full ui-btn-primary">
            {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight size={15} /></>}
          </button>
          <p className="text-[11px] text-slate-500">Problemas para acessar?{' '}<a href="https://wa.me/5547988992438?text=Ol%C3%A1%2C%20estou%20com%20problemas%20para%20acessar%20a%20Patota%20CCC." target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline underline-offset-2">Chame a diretoria no WhatsApp</a>.</p>
        </form>
      </div>
    </div>
  )
}
