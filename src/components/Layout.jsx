import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Star,
  Trophy,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const mainNav = [
  { path: '/', icon: Home, label: 'Visao geral' },
  { path: '/events', icon: CalendarDays, label: 'Jogos' },
  { path: '/finance', icon: CircleDollarSign, label: 'Financeiro' },
  { path: '/ranking', icon: Trophy, label: 'Ranking' },
  { path: '/cards', icon: Star, label: 'Elenco' },
  { path: '/rules', icon: FileText, label: 'Regras' },
  { path: '/help', icon: HelpCircle, label: 'Como usar' }
]

export default function Layout() {
  const location = useLocation()
  const { member, isAdmin, signOut } = useAuth()
  const navItems = isAdmin
    ? [...mainNav, { path: '/admin', icon: Settings, label: 'Administracao' }]
    : mainNav
  const initials = member?.nome
    ? member.nome.split(' ').slice(0, 2).map((name) => name[0]).join('').toUpperCase()
    : 'PC'

  return (
    <div className="min-h-screen bg-app">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand" aria-label="Patota CCC - inicio">
            <span className="brand-mark"><span>p</span></span>
            <span className="brand-copy">
              <strong>Patota CCC</strong>
              <small>Gestao da pelada</small>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="Navegacao principal">
            {navItems.map(({ path, label }) => (
              <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'desktop-nav-link active' : 'desktop-nav-link'}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="profile-menu">
            {isAdmin && <span className="admin-chip"><ShieldCheck size={14} /> Admin</span>}
            <div className="avatar" aria-hidden="true">{initials}</div>
            <div className="profile-copy">
              <strong>{member?.nome || 'Membro da Patota'}</strong>
              <span>{member?.posicao || 'Atleta'}</span>
            </div>
            <button onClick={signOut} className="icon-button" title="Sair" aria-label="Sair da conta">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="page-context">
          <div>
            <p className="eyebrow">Temporada {new Date().getFullYear()}</p>
            <h1>{location.pathname === '/' ? `Ola, ${member?.nome?.split(' ')[0] || 'jogador'}` : navItems.find((item) => item.path === location.pathname)?.label}</h1>
          </div>
          <div className="season-pill">Patota CCC</div>
        </div>
        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="Navegacao mobile">
        {navItems.slice(0, isAdmin ? 8 : 7).map(({ path, icon: Icon, label }) => (
          <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
            <Icon size={20} />
            <span>{label === 'Visao geral' ? 'Inicio' : label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
