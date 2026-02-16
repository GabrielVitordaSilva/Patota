import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { adminService } from '../../services/admin'
import { financeService } from '../../services/finance'

export default function AdminMembers() {
  const { member: currentMember } = useAuth()
  const [members, setMembers] = useState([])

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    const { data } = await adminService.getAllMembers()
    setMembers(data || [])
  }

  const handleToggleStatus = async (memberId, currentStatus) => {
    await adminService.toggleMemberStatus(memberId, !currentStatus)
    alert('Status atualizado!')
    loadMembers()
  }

  const handleCreateExemption = async (memberId) => {
    const motivo = prompt('Motivo da isenção (LESAO ou TRABALHO):')
    if (!motivo) return
    
    const now = new Date()
    const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    await financeService.createExemption(memberId, competencia, motivo.toUpperCase(), currentMember.id)
    alert('Isenção criada!')
  }

  const handleGenerateDues = async () => {
    if (!confirm('Gerar mensalidades do mês atual para todos os membros ativos?')) return
    
    const now = new Date()
    await financeService.generateMonthlyDues(now.getFullYear(), now.getMonth() + 1)
    alert('Mensalidades geradas!')
  }

  return (
    <div className="space-y-6">
      <button
        onClick={handleGenerateDues}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold"
      >
        Gerar Mensalidades do Mês
      </button>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Users size={24} />
          Membros
        </h3>
        
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{member.nome}</p>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  member.ativo
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {member.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleStatus(member.id, member.ativo)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold"
                >
                  {member.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleCreateExemption(member.id)}
                  className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-semibold"
                >
                  Isentar Mês
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
