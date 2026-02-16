import { Link, useLocation, Outlet } from 'react-router-dom'
import { Home, Calendar, DollarSign, Trophy, FileText, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const location = useLocation()
  const { member, isAdmin, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/events', icon: Calendar, label: 'Eventos' },
    { path: '/finance', icon: DollarSign, label: 'Financeiro' },
    { path: '/ranking', icon: Trophy, label: 'Ranking' },
    { path: '/rules', icon: FileText, label: 'Regras' }
  ]

  if (isAdmin) {
    navItems.push({ path: '/admin', icon: Settings, label: 'Admin' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Patota CCC</h1>
              <p className="text-sm text-emerald-100">OlÃ¡, {member?.nome}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 rounded-lg hover:bg-emerald-800 transition"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-1">
          <div
            className="grid items-center"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 py-2 px-1 transition ${
                    isActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[11px] font-medium leading-none">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-20"></div>
    </div>
  )
}
