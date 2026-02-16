import { useEffect, useState } from 'react'
import { Users, Edit } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { adminService } from '../../services/admin'
import { financeService } from '../../services/finance'
import AdminAddMember from './AdminAddMember'
import AdminEditDue from './AdminEditDue'

export default function AdminMembers() {
  const { member: currentMember } = useAuth()
  const [members, setMembers] = useState([])
  const [memberDues, setMemberDues] = useState({})
  const [editingDue, setEditingDue] = useState(null)

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    if (members.length > 0) {
      members.forEach((m) => loadMemberDues(m.id))
    }
  }, [members])

  const loadMembers = async () => {
    try {
      const { data } = await adminService.getAllMembers()
      setMembers(data || [])
    } catch (error) {
      console.error('Error loading members:', error)
      setMembers([])
    }
  }

  const loadMemberDues = async (memberId) => {
    const now = new Date()
    const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const { data } = await supabase
      .from('dues')
      .select('*, members(nome)')
      .eq('member_id', memberId)
      .eq('competencia', competencia)
      .maybeSingle()

    if (data) {
      setMemberDues((prev) => ({ ...prev, [memberId]: data }))
    }
  }

  const handleToggleStatus = async (memberId, currentStatus) => {
    await adminService.toggleMemberStatus(memberId, !currentStatus)
    alert('Status atualizado!')
    loadMembers()
  }

  const handleCreateExemption = async (memberId) => {
    const motivo = prompt('Motivo da isencao (LESAO ou TRABALHO):')
    if (!motivo) return

    const now = new Date()
    const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    await financeService.createExemption(memberId, competencia, motivo.toUpperCase(), currentMember.id)
    alert('Isencao criada!')
    loadMemberDues(memberId)
  }

  const handleGenerateDues = async () => {
    if (!confirm('Gerar mensalidades do mes atual para todos os membros ativos?')) return

    const now = new Date()
    const { error, generatedCount } = await financeService.generateMonthlyDues(now.getFullYear(), now.getMonth() + 1)

    if (error) {
      console.error('Error generating dues:', error)
      alert(`Erro ao gerar mensalidades: ${error.message}`)
      return
    }

    if (!generatedCount) {
      alert('Nenhuma mensalidade nova foi criada. As mensalidades deste mes ja existem.')
      return
    }

    alert(`Mensalidades geradas! Total: ${generatedCount}`)
    loadMembers()
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerateDues}
        className="w-full bg-emerald-600 text-white py-3 md:py-4 rounded-xl font-bold text-sm md:text-base"
      >
        Gerar Mensalidades do Mes
      </button>

      <AdminAddMember onSuccess={loadMembers} />

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
                  <p className="font-semibold text-sm md:text-base text-gray-800 truncate">{member.nome}</p>
                  <p className="text-xs md:text-sm text-gray-600 truncate">{member.email}</p>
                  {memberDues[member.id] && (
                    <p className="text-xs text-gray-500 mt-1">
                      Mensalidade atual: R$ {memberDues[member.id].valor.toFixed(2)} - {memberDues[member.id].status}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap ml-2 ${
                    member.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {member.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleToggleStatus(member.id, member.ativo)}
                  className="bg-gray-100 text-gray-700 py-2 rounded-lg text-xs md:text-sm font-semibold"
                >
                  {member.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleCreateExemption(member.id)}
                  className="bg-blue-100 text-blue-700 py-2 rounded-lg text-xs md:text-sm font-semibold"
                >
                  Isentar
                </button>
                {memberDues[member.id] && (
                  <button
                    onClick={() => setEditingDue(memberDues[member.id])}
                    className="bg-orange-100 text-orange-700 py-2 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-1"
                  >
                    <Edit size={14} />
                    Editar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingDue && (
        <AdminEditDue
          due={editingDue}
          onClose={() => setEditingDue(null)}
          onSuccess={() => {
            loadMembers()
            loadMemberDues(editingDue.member_id)
          }}
        />
      )}
    </div>
  )
}