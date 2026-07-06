import { useEffect, useState } from 'react'
import { Users, Edit, Trash2, X } from 'lucide-react'
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
  const [editingMember, setEditingMember] = useState(null)
  const [editForm, setEditForm] = useState({ nome: '', posicao: 'LINHA' })
  const [savingMember, setSavingMember] = useState(false)

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

  const openEditMember = (member) => {
    setEditingMember(member)
    setEditForm({ nome: member.nome || '', posicao: member.posicao || 'LINHA' })
  }

  const handleSaveMember = async (e) => {
    e.preventDefault()
    setSavingMember(true)

    try {
      const { error } = await adminService.updateMember(editingMember.id, {
        nome: editForm.nome.trim(),
        posicao: editForm.posicao
      })

      if (error) throw error

      alert('Membro atualizado!')
      setEditingMember(null)
      loadMembers()
    } catch (error) {
      alert(`Erro ao atualizar membro: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setSavingMember(false)
    }
  }

  const handleDeleteMember = async (member) => {
    if (
      !confirm(
        `Excluir ${member.nome}?\n\nIsso apaga TODO o historico do membro: pontos, presencas, mensalidades, multas e pagamentos.\n\nEssa acao nao pode ser desfeita. Se quiser apenas afastar o membro, use "Desativar".`
      )
    ) {
      return
    }

    const { error } = await adminService.deleteMember(member.id)

    if (error) {
      alert(`Erro ao excluir membro: ${error.message}`)
      return
    }

    alert('Membro excluido!')
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
        className="w-full ui-btn-primary rounded-xl font-bold text-sm md:text-base"
      >
        Gerar Mensalidades do Mes
      </button>

      <AdminAddMember onSuccess={loadMembers} />

      <div className="ui-card ui-card-body">
        <h3 className="ui-title mb-4 flex items-center gap-2">
          <Users size={20} className="md:w-6 md:h-6" />
          Membros
        </h3>

        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm md:text-base text-gray-800 truncate">{member.nome}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold whitespace-nowrap ${
                        member.posicao === 'GOLEIRO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {member.posicao === 'GOLEIRO' ? 'Goleiro' : 'Linha'}
                    </span>
                  </div>
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
                  onClick={() => openEditMember(member)}
                  className="ui-btn-primary text-xs md:text-sm"
                >
                  <Edit size={14} />
                  Editar
                </button>
                <button
                  onClick={() => handleToggleStatus(member.id, member.ativo)}
                  className="ui-btn-ghost text-xs md:text-sm"
                >
                  {member.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleCreateExemption(member.id)}
                  className="ui-btn-info text-xs md:text-sm"
                >
                  Isentar
                </button>
                {memberDues[member.id] && (
                  <button
                    onClick={() => setEditingDue(memberDues[member.id])}
                    className="ui-btn-warning text-xs md:text-sm"
                  >
                    Mensalidade
                  </button>
                )}
                {member.id !== currentMember?.id && (
                  <button
                    onClick={() => handleDeleteMember(member)}
                    className="ui-btn-danger text-xs md:text-sm"
                  >
                    <Trash2 size={14} />
                    Excluir
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

      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar Membro</h3>
              <button onClick={() => setEditingMember(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))}
                  className="ui-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Posicao</label>
                <select
                  value={editForm.posicao}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, posicao: e.target.value }))}
                  className="ui-input"
                >
                  <option value="LINHA">Jogador de Linha</option>
                  <option value="GOLEIRO">Goleiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email (login)</label>
                <input type="email" value={editingMember.email} className="ui-input bg-gray-100" disabled />
                <p className="text-xs text-gray-500 mt-1">
                  O email de login e gerenciado pelo Supabase Auth e nao pode ser alterado por aqui.
                </p>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={savingMember} className="flex-1 ui-btn-primary">
                  {savingMember ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => setEditingMember(null)} className="flex-1 ui-btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
