import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen bg-[#f3eee2] grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden lg:flex relative overflow-hidden bg-[#123120] text-[#f3eee2] p-14 flex-col justify-between border-r-4 border-[#d4561f]">
        <svg className="absolute inset-0 w-full h-full opacity-[.09]" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#f3eee2" strokeWidth="2" aria-hidden="true">
          <rect x="30" y="30" width="340" height="540" /><line x1="30" y1="300" x2="370" y2="300" /><circle cx="200" cy="300" r="60" /><rect x="110" y="30" width="180" height="80" /><rect x="110" y="490" width="180" height="80" />
        </svg>
        <div className="relative flex items-center gap-3"><span className="brand-mark"><span>p</span></span><p className="font-display text-2xl font-bold uppercase tracking-wider">Patota CCC</p></div>
        <div className="relative max-w-lg">
          <h1 className="font-display text-7xl font-bold uppercase leading-[.9]">Bola rolando,<br />contas em dia.</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#b7cabb]">Presenca, times, mensalidades e ranking da pelada num so lugar.</p>
        </div>
        <p className="relative text-xs text-[#9db9a3]">Patota CCC · Temporada {new Date().getFullYear()}</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="max-w-sm w-full">
          <div className="lg:hidden flex items-center gap-3 mb-10"><span className="brand-mark !bg-[#123120] !text-[#f3eee2]"><span>p</span></span><p className="font-display text-2xl font-bold uppercase tracking-wider text-slate-900">Patota CCC</p></div>
          <div className="mb-8">
            <p className="eyebrow">Area do membro</p>
            <h2 className="mt-2 text-5xl font-bold uppercase leading-none text-slate-950">Entrar</h2>
            <p className="mt-3 text-sm text-slate-600">Use o e-mail cadastrado pela diretoria.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-1.5">E-mail</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ui-input" placeholder="seu@email.com" required />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-800 mb-1.5">Senha</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="ui-input" placeholder="••••••••" required />
            </div>

            {error && <div role="alert" className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <button type="submit" disabled={loading} className="w-full ui-btn-primary py-3">
              {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight size={17} /></>}
            </button>
          </form>
          <p className="mt-7 pt-5 border-t border-slate-300 text-xs text-slate-500">Problemas para acessar? Fale com a diretoria.</p>
        </div>
      </section>
    </div>
  )
}
