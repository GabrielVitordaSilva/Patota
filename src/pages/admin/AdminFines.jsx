import { useEffect, useState } from 'react'
import { Pencil, Trash2, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { financeService } from '../../services/finance'

const TIPOS = { ATRASO: 'Atraso', FALTA_CONFIRMADA: 'Falta confirmada', CONVIDADO: 'Convidado' }

export default function AdminFines() {
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('abertas')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadFines()
  }, [])

  const loadFines = async () => {
    setLoading(true)
    const { data } = await financeService.getAllFines()
    setFines(data || [])
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const valor = parseFloat(form.get('valor'))
    if (!Number.isFinite(valor) || valor <= 0) {
      alert('Informe um valor maior que zero.')
      return
    }

    setSaving(true)
    try {
      const { error } = await financeService.updateFine(editing.id, {
        tipo: form.get('tipo'),
        valor,
        obs: String(form.get('obs') || '').trim()
      })
      if (error) throw error
      setEditing(null)
      await loadFines()
    } catch (error) {
      alert(`Erro ao salvar a multa: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (fine) => {
    const quem = fine.members?.nome || 'o membro'
    if (!confirm(`Excluir a multa de R$ ${fine.valor.toFixed(2)} de ${quem}?\n\nEla some da tela dele e o lancamento correspondente sai do caixa.`)) return

    const { error } = await financeService.deleteFine(fine.id)
    if (error) {
      alert(`Erro ao excluir a multa: ${error.message}`)
      return
    }
    await loadFines()
  }

  const visible = fines.filter((f) => (filter === 'abertas' ? !f.pago : true))
  const abertas = fines.filter((f) => !f.pago).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600"><strong>{abertas}</strong> multa(s) em aberto</p>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {[['abertas', 'Em aberto'], ['todas', 'Todas']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`px-3 py-1 rounded-md text-xs font-semibold ${filter === id ? 'bg-blue-700 text-white' : 'text-slate-600'}`}>{label}</button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">Gerou uma multa sem querer? Edite o valor ou o tipo, ou exclua. Multas ja pagas ficam bloqueadas para nao desacertar o caixa.</p>

      {loading ? (
        <div className="ui-card p-8 text-center text-slate-500">Carregando multas...</div>
      ) : visible.length === 0 ? (
        <div className="ui-card p-8 text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-2" size={36} />
          <p className="text-slate-600">Nenhuma multa {filter === 'abertas' ? 'em aberto' : 'registrada'}</p>
        </div>
      ) : (
        visible.map((fine) => (
          <div key={fine.id} className="ui-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{fine.members?.nome || 'Membro removido'}</p>
              <p className="text-sm text-slate-600">
                {TIPOS[fine.tipo] || fine.tipo}
                {fine.events?.data_hora && ` · ${format(new Date(fine.events.data_hora), 'dd/MM/yyyy')}`}
              </p>
              {fine.obs && <p className="text-xs text-slate-500 mt-0.5">{fine.obs}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${fine.pago ? 'text-slate-500' : 'text-red-600'}`}>R$ {fine.valor.toFixed(2)}</span>
              {fine.pago ? (
                <span className="badge badge-ok">Paga</span>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditing(fine)} className="ui-btn-secondary !min-h-8 !px-3 text-xs" aria-label={`Editar multa de ${fine.members?.nome}`}><Pencil size={14} /> Editar</button>
                  <button type="button" onClick={() => handleDelete(fine)} className="ui-btn-danger !min-h-8 !px-3 text-xs" aria-label={`Excluir multa de ${fine.members?.nome}`}><Trash2 size={14} /> Excluir</button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-300 w-full max-w-sm p-5 space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-slate-900">Editar multa de {editing.members?.nome}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="fine-tipo">Tipo</label>
              <select id="fine-tipo" name="tipo" defaultValue={editing.tipo} className="ui-input">
                {Object.entries(TIPOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="fine-valor">Valor (R$)</label>
              <input id="fine-valor" name="valor" type="number" step="0.01" min="0.01" defaultValue={editing.valor} className="ui-input" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="fine-obs">Observacao</label>
              <input id="fine-obs" name="obs" type="text" defaultValue={editing.obs || ''} className="ui-input" placeholder="Opcional" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 ui-btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 ui-btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
