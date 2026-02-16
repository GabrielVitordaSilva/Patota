import { useState } from 'react'
import { Users, Calendar, DollarSign, FileText } from 'lucide-react'
import AdminEvents from './AdminEvents'
import AdminCaixa from './AdminCaixa'
import AdminMembers from './AdminMembers'
import AdminPayments from './AdminPayments'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('events')

  const tabs = [
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'caixa', label: 'Caixa', icon: DollarSign },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'payments', label: 'Pagamentos', icon: FileText }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Painel Admin</h1>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md p-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'events' && <AdminEvents />}
        {activeTab === 'caixa' && <AdminCaixa />}
        {activeTab === 'members' && <AdminMembers />}
        {activeTab === 'payments' && <AdminPayments />}
      </div>
    </div>
  )
}
