import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarDays, CircleDollarSign, HelpCircle, FileText, Home, LogOut, Moon, Settings, ShieldCheck, Star, Sun, Trophy
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Tour from './Tour'
import RulesModal from './RulesModal'

const mainNav = [
  { path: '/', icon: Home, label: 'Visao geral', short: 'Inicio' },
  { path: '/events', icon: CalendarDays, label: 'Jogos' },
  { path: '/finance', icon: CircleDollarSign, label: 'Financeiro' },
  { path: '/ranking', icon: Trophy, label: 'Ranking' },
  { path: '/cards', icon: Star, label: 'Elenco' }
]

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <i style={{ height: 11, background: '#3b82f6' }} />
      <i style={{ height: 18, background: '#10b981' }} />
      <i style={{ height: 8, background: '#fbbf24' }} />
      <i style={{ height: 14, background: '#a855f7' }} />
    </span>
  )
}

export default function Layout() {
  const location = useLocation()
  const { member, isAdmin, signOut } = useAuth()
  const [showRules, setShowRules] = useState(false)
  const navItems = isAdmin
    ? [...mainNav, { path: '/admin', icon: Settings, label: 'Administracao', short: 'Admin' }]
    : mainNav
  const initials = member?.nome
    ? member.nome.split(' ').slice(0, 2).map((name) => name[0]).join('').toUpperCase()
    : 'PC'
  const atual = navItems.find((item) => item.path === location.pathname)
  const titulo = location.pathname === '/' ? `Ola, ${member?.nome?.split(' ')[0] || 'jogador'}` : atual?.label

  return (
    <>
      <header className="topbar">
        <div className="topbar-esq">
          <Link to="/" className="marca" aria-label="Patota CCC - inicio"><Logo />Patota CCC</Link>
          <nav className="nav" aria-label="Navegacao principal" data-tour="menu">
            {navItems.map(({ path, label }) => (
              <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-dir">
          <button type="button" className="btn-ajuda" data-tour="regras" onClick={() => setShowRules(true)} title="Ver as regras da patota"><FileText size={14} /><span>Regras</span></button>
          <button type="button" className="btn-ajuda" data-tour="ajuda" data-tour-iniciar title="Ver o guia desta tela"><HelpCircle size={14} /><span>Como usar</span></button>
          <div className="perfil" data-tour="perfil">
            <div className="avatar" aria-hidden="true">{initials}</div>
            <div className="quem">
              <strong>{member?.nome || 'Membro da Patota'}</strong>
              <span>{isAdmin ? 'Administrador' : (member?.posicao || 'Atleta')}</span>
            </div>
            {isAdmin && <span className="admin-chip"><ShieldCheck size={12} /> Admin</span>}
            <button onClick={signOut} className="icon-btn" title="Sair" aria-label="Sair da conta"><LogOut size={15} /></button>
          </div>
        </div>
      </header>

      <main className="pagina">
        {location.pathname === '/' && <div className="cabeca"><h1>{titulo}</h1></div>}
        <Outlet />
      </main>

      <footer className="rodape-app">
        <div><b>Patota CCC</b> · Gestao da pelada</div>
        <div>Temporada {new Date().getFullYear()}</div>
      </footer>

      <nav className="mobile-nav" aria-label="Navegacao mobile">
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
