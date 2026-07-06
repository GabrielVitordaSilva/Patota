import { useEffect, useMemo, useState } from 'react'
import { Trophy, SlidersHorizontal, History, Trash2, X } from 'lucide-react'
import { adminService } from '../../services/admin'

export default function AdminRanking() {
  const [members, setMembers] = useState([])
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [adjustingMember, setAdjustingMember] = useState(null)
  const [historyMember, setHistoryMember] = useState(null)
  const [pontos, setPontos] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [membersResult, ledgerResult] = await Promise.all([
        adminService.getAllMembers(),
        adminService.getPointsLedger()
      ])

      if (ledgerResult.error) {
        setLoadError(
          `Erro ao carregar pontos: ${ledgerResult.error.message}. Verifique se a migracao supabase-add-admin-crud.sql foi executada no Supabase.`
        )
      }

      setMembers(membersResult.data || [])
      setLedger(ledgerResult.data || [])
    } catch (error) {
      console.error('Error loading ranking admin:', error)
      setLoadError('Erro ao carregar dados do ranking.')
    } finally {
      setLoading(false)
    }
  }

  const ranking = useMemo(() => {
    const totals = {}
    ledger.forEach((entry) => {
      if (!totals[entry.member_id]) {
        totals[entry.member_id] = { pontos: 0, gols: 0 }
      }
      totals[entry.member_id].pontos += entry.pontos
      totals[entry.member_id].gols += entry.gols || 0
    })

    return [...members]
      .map((m) => ({
        ...m,
        pontos: totals[m.id]?.pontos || 0,
        gols: totals[m.id]?.gols || 0
      }))
      .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome))
  }, [members, ledger])

  const openAdjust = (member) => {
    setAdjustingMember(member)
    setPontos('')
    setObs('')
  }

  const handleAdjust = async (e) => {
    e.preventDefault()

    const valor = parseInt(pontos, 10)
    if (!Number.isInteger(valor) || valor === 0) {
      alert('Informe um numero de pontos diferente de zero. Use valor negativo para remover pontos.')
      return
    }

    setSaving(true)
    try {
      const { error } = await adminService.addPointsAdjustment(adjustingMember.id, valor, obs.trim())
      if (error) throw error

      alert('Pontos ajustados!')
      setAdjustingMember(null)
      await loadData()
    } catch (error) {
      alert(`Erro ao ajustar pontos: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (entry) => {
    if (!confirm(`Excluir este lancamento de ${entry.pontos} ponto(s)? O total do jogador sera recalculado.`)) return

    const { error } = await adminService.deletePointsEntry(entry.id)
    if (error) {
      alert(`Erro ao excluir lancamento: ${error.message}`)
      return
    }

    await loadData()
  }

  const motivoLabel = (motivo) => {
    const labels = {
      GOLS_TIME: 'Gols do time',
      BONUS: 'Ajuste manual (+)',
      PENALIDADE: 'Ajuste manual (-)'
    }
    return labels[motivo] || motivo
  }

  const historyEntries = historyMember ? ledger.filter((entry) => entry.member_id === historyMember.id) : []

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      )}

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Ajuste manual:</strong> use "Ajustar" para somar ou remover pontos de um jogador (valores
          negativos removem). Em "Historico" voce pode excluir lancamentos errados, inclusive de placares.
        </p>
      </div>

      <div className="ui-card ui-card-body">
        <h3 className="ui-title mb-4 flex items-center gap-2">
          <Trophy size={20} className="md:w-6 md:h-6" />
          Gerenciar Ranking
        </h3>

        {ranking.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum membro cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {ranking.map((member, index) => (
              <div key={member.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-gray-500 w-8 text-center">{index + 1}º</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm md:text-base text-gray-800 truncate">{member.nome}</p>
                      <p className="text-xs text-gray-500">{member.gols} gols</p>
                    </div>
                  </div>
                  <span className="text-xl md:text-2xl font-bold text-emerald-600 whitespace-nowrap ml-2">
                    {member.pontos} pts
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => openAdjust(member)} className="ui-btn-primary text-xs md:text-sm">
                    <SlidersHorizontal size={14} className="inline mr-1" />
                    Ajustar
                  </button>
                  <button onClick={() => setHistoryMember(member)} className="ui-btn-secondary text-xs md:text-sm">
                    <History size={14} className="inline mr-1" />
                    Historico
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {adjustingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Ajustar Pontos</h3>
              <button onClick={() => setAdjustingMember(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              <strong>{adjustingMember.nome}</strong> tem{' '}
              <strong>{ranking.find((m) => m.id === adjustingMember.id)?.pontos || 0} pontos</strong> hoje.
            </p>

            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pontos</label>
                <input
                  type="number"
                  step="1"
                  value={pontos}
                  onChange={(e) => setPontos(e.target.value)}
                  className="ui-input"
                  placeholder="Ex: 3 ou -2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Positivo soma, negativo remove pontos do ranking.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Motivo (opcional)</label>
                <input
                  type="text"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  className="ui-input"
                  placeholder="Ex: correcao de placar"
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 ui-btn-primary">
                  {saving ? 'Salvando...' : 'Salvar Ajuste'}
                </button>
                <button type="button" onClick={() => setAdjustingMember(null)} className="flex-1 ui-btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 truncate">Historico - {historyMember.nome}</h3>
              <button onClick={() => setHistoryMember(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {historyEntries.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum lancamento de pontos para este membro.</p>
              ) : (
                historyEntries.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{motivoLabel(entry.motivo)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.criado_em).toLocaleDateString('pt-BR')}
                        {entry.events?.local ? ` - ${entry.events.local}` : ''}
                        {entry.time ? ` - Time ${entry.time}` : ''}
                      </p>
                      {entry.obs && <p className="text-xs text-gray-600 mt-1 truncate">{entry.obs}</p>}
                    </div>
                    <span
                      className={`font-bold whitespace-nowrap ${
                        entry.pontos < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {entry.pontos > 0 ? `+${entry.pontos}` : entry.pontos}
                    </span>
                    <button
                      onClick={() => handleDeleteEntry(entry)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Excluir lancamento"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
