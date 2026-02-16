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
    <div className="space-y-4">
      <button
        onClick={handleGenerateDues}
        className="w-full bg-emerald-600 text-white py-3 md:py-4 rounded-xl font-bold text-sm md:text-base"
      >
        Gerar Mensalidades do Mês
      </button>

      <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
        <h3 className="font-bold text-base md:text-lg mb-4 flex items-center gap-2">
          <Users size={20} className="md:w-6 md:h-6" />
          Membros
        </h3>
        
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm md:text-base text-gray-800 truncate">
                    {member.nome}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    {member.email}
                  </p>
                </div>
                <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap ml-2 ${
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
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs md:text-sm font-semibold"
                >
                  {member.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleCreateExemption(member.id)}
                  className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-xs md:text-sm font-semibold"
                >
                  Isentar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
