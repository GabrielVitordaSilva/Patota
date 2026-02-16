import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function AdminEditDue({ due, onClose, onSuccess }) {
  const [valor, setValor] = useState(due.valor)
  const [status, setStatus] = useState(due.status)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('dues')
        .update({
          valor: parseFloat(valor),
          status
        })
        .eq('id', due.id)

      if (error) throw error

      alert('Mensalidade atualizada!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao atualizar mensalidade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Editar Mensalidade</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Membro</p>
          <p className="font-semibold text-gray-800">{due.members?.nome}</p>
          <p className="text-xs text-gray-500">{due.competencia}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="ui-input"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Valor original: R$ 35,00</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="ui-input"
            >
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="ISENTO">Isento</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 ui-btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 ui-btn-primary"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
