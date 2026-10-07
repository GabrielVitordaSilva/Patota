import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarDays, CircleDollarSign, HelpCircle, FileText, Home, LogOut, Moon, Settings, ShieldCheck, Star, Sun, Trophy
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Tour from './Tour'
import NotificationBell from './NotificationBell'
import { pushService } from '../services/push'
import RulesModal from './RulesModal'

const mainNav = [
  { path: '/', icon: Home, label: 'Visão geral', short: 'Início' },
  { path: '/events', icon: CalendarDays, label: 'Jogos' },
  { path: '/finance', icon: CircleDollarSign, label: 'Financeiro' },
  { path: '/ranking', icon: Trophy, label: 'Ranking' },
  { path: '/cards', icon: Star, label: 'Elenco' }
]

export function Logo() {
  return <img src="/favicon.svg" alt="" width="24" height="24" aria-hidden="true" />
}

export default function Layout() {
  const location = useLocation()
  const { member, isAdmin, signOut } = useAuth()
  const [showRules, setShowRules] = useState(false)
  const navItems = isAdmin
    ? [...mainNav, { path: '/admin', icon: Settings, label: 'Administração', short: 'Admin' }]
    : mainNav
  const initials = member?.nome
    ? member.nome.split(' ').slice(0, 2).map((name) => name[0]).join('').toUpperCase()
    : 'PC'
  const atual = navItems.find((item) => item.path === location.pathname)
  const titulo = location.pathname === '/' ? `Olá, ${member?.nome?.split(' ')[0] || 'jogador'}` : atual?.label

  return (
    <>
      <header className="topbar">
        <div className="topbar-esq">
          <Link to="/" className="marca" aria-label="Patota CCC - inicio"><Logo />Patota CCC</Link>
          <nav className="nav" aria-label="Navegação principal" data-tour="menu">
            {navItems.map(({ path, label }) => (
              <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-dir">
          <button type="button" className="btn-ajuda" data-tour="regras" onClick={() => setShowRules(true)} title="Ver as regras da patota"><FileText size={14} /><span>Regras</span></button>
          <button type="button" className="btn-ajuda" data-tour="ajuda" data-tour-iniciar title="Ver o guia desta tela"><HelpCircle size={14} /><span>Como usar</span></button>
          <NotificationBell memberId={member?.id} />
          <div className="perfil" data-tour="perfil">
            <div className="avatar" aria-hidden="true">{initials}</div>
            <div className="quem">
              <strong>{member?.nome || 'Membro da Patota'}</strong>
              <span>{isAdmin ? 'Administrador' : (member?.posicao || 'Atleta')}</span>
            </div>
            {isAdmin && <span className="admin-chip"><ShieldCheck size={12} /> Admin</span>}
            <button onClick={async () => { await pushService.removeFromThisDevice(); signOut() }} className="icon-btn" title="Sair" aria-label="Sair da conta"><LogOut size={15} /></button>
          </div>
        </div>
      </header>

      <main className="pagina">
        {location.pathname === '/' && <div className="cabeca"><h1>{titulo}</h1></div>}
        <Outlet />
      </main>

      <footer className="rodape-app">
        <div><b>Patota CCC</b> · Gestão da pelada</div>
        <div>Temporada {new Date().getFullYear()}</div>
      </footer>

      <nav className="mobile-nav" aria-label="Navegação mobile">
        {navItems.map(({ path, icon: Icon, label, short }) => (
          <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={19} /><span>{short || label}</span>
          </NavLink>
        ))}
      </nav>
      <Tour isAdmin={isAdmin} />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  )
}
