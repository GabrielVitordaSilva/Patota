import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { financeService } from '../../services/finance'

export default function AdminCaixa() {
  const { member } = useAuth()
  const [balance, setBalance] = useState(0)
  const [ledger, setLedger] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { balance: bal } = await financeService.getCashBalance()
    const { data: led } = await financeService.getCashLedger()
    setBalance(bal)
    setLedger(led || [])
  }

  const handleAddCashOut = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)

    await financeService.createCashOut(
      formData.get('categoria'),
      parseFloat(formData.get('valor')),
      formData.get('obs'),
      member.id
    )

    alert('Saida lancada!')
    setShowAddForm(false)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl shadow-md p-6">
        <p className="text-sm mb-2">Saldo do Caixa</p>
        <p className="text-4xl font-bold">R$ {balance.toFixed(2)}</p>
      </div>

      {!showAddForm ? (
        <button onClick={() => setShowAddForm(true)} className="w-full ui-btn-danger rounded-xl font-bold">
          Lancar Saida
        </button>
      ) : (
        <div className="ui-card p-6">
          <h3 className="ui-title mb-4">Nova Saida</h3>
          <form onSubmit={handleAddCashOut} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Categoria</label>
              <select name="categoria" className="ui-input" required>
                <option value="CAMPO">Campo</option>
                <option value="MATERIAIS">Materiais</option>
                <option value="CONFRATERNIZACAO">Confraternizacao</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valor</label>
              <input type="number" name="valor" step="0.01" className="ui-input" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Observacao</label>
              <input type="text" name="obs" className="ui-input" placeholder="Descricao da despesa" />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="flex-1 ui-btn-danger">
                Lancar
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 ui-btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="ui-card p-6">
        <h3 className="ui-title mb-4">Extrato</h3>
        <div className="space-y-2">
          {ledger.slice(0, 20).map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {item.tipo === 'ENTRADA' ? (
                  <TrendingUp className="text-emerald-600" size={20} />
                ) : (
                  <TrendingDown className="text-red-600" size={20} />
                )}
                <div>
                  <p className="font-semibold text-gray-800">{item.categoria}</p>
                  <p className="text-xs text-gray-500">{new Date(item.criado_em).toLocaleDateString()}</p>
                </div>
              </div>
              <span className={`font-bold ${item.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-600'}`}>
                {item.tipo === 'ENTRADA' ? '+' : '-'} R$ {item.valor.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
