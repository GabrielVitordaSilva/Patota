import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight, ShieldCheck, Users } from 'lucide-react'

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
    <div className="min-h-screen bg-[#f4f6fa] grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden lg:flex relative overflow-hidden bg-[#172033] text-white p-14 flex-col justify-between">
        <div className="absolute inset-0 opacity-[.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
        <div className="relative flex items-center gap-3"><span className="brand-mark"><span>p</span></span><div><p className="font-bold">Patota CCC</p><p className="text-xs text-slate-400">Gestao da pelada</p></div></div>
        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-xs text-slate-300"><Users size={14} /> Feito para quem organiza e para quem joga</span>
          <h1 className="mt-6 text-5xl font-bold tracking-[-.05em] leading-[1.08]">Sua pelada organizada, sem complicacao.</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">Jogos, presencas, mensalidades e ranking reunidos em um lugar simples para toda a patota.</p>
        </div>
        <p className="relative text-xs text-slate-500">Patota CCC · Temporada 2024</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 bg-white lg:bg-[#f4f6fa]">
        <div className="max-w-sm w-full">
          <div className="lg:hidden flex items-center gap-3 mb-12"><span className="brand-mark"><span>p</span></span><div><p className="font-bold text-slate-900">Patota CCC</p><p className="text-xs text-slate-500">Gestao da pelada</p></div></div>
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-blue-600">Area do membro</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Bom ter voce de volta</h2>
            <p className="mt-2 text-sm text-slate-500">Entre com seus dados para acessar a Patota CCC.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ui-input"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ui-input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          
            <button
              type="submit"
              disabled={loading}
              className="w-full ui-btn-primary py-3"
            >
              {loading ? 'Entrando...' : <><span>Entrar na Patota</span><ArrowRight size={17} /></>}
            </button>
          </form>
          <div className="mt-7 pt-6 border-t border-slate-200 flex items-start gap-3 text-xs text-slate-500"><ShieldCheck size={17} className="text-emerald-600 shrink-0" /><p>Seu acesso e individual e protegido. Em caso de duvida, fale com a diretoria.</p></div>
        </div>
      </section>
    </div>
  )
}
