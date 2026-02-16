import { useState } from 'react'
import { Users, Calendar, DollarSign, FileText } from 'lucide-react'
import AdminFinanceDashboard from './AdminFinanceDashboard'
import AdminEvents from './AdminEvents'
import AdminCaixa from './AdminCaixa'
import AdminMembers from './AdminMembers'
import AdminPayments from './AdminPayments'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: DollarSign },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'caixa', label: 'Caixa', icon: DollarSign },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'payments', label: 'Pagamentos', icon: FileText }
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800">Painel Admin</h1>

      {/* Tabs - Responsivo */}
      <div className="bg-white rounded-xl shadow-md p-2">
        <div className="grid grid-cols-5 gap-1 md:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-12 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs md:text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} className="md:w-6 md:h-6" />
                <span className="text-[10px] md:text-sm leading-tight">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && <AdminFinanceDashboard />}
        {activeTab === 'events' && <AdminEvents />}
        {activeTab === 'caixa' && <AdminCaixa />}
        {activeTab === 'members' && <AdminMembers />}
        {activeTab === 'payments' && <AdminPayments />}
      </div>
    </div>
  )
}
