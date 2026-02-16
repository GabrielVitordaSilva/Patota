import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { configService } from '../../services/config'
import { financeService } from '../../services/finance'

export default function AdminFinanceDashboard() {
  const [stats, setStats] = useState(null)
  const [debtors, setDebtors] = useState([])
  const [pixKey, setPixKey] = useState('')
  const [savingPix, setSavingPix] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
    loadPixKey()
  }, [])

  const loadDashboard = async () => {
    try {
      const now = new Date()
      const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const { balance } = await financeService.getCashBalance()

      const { data: dues } = await supabase
        .from('dues')
        .select('*')
        .eq('competencia', competencia)

      const totalMensalidades = dues?.reduce((sum, d) => sum + d.valor, 0) || 0
      const pagasMensalidades = dues?.filter((d) => d.status === 'PAGO').reduce((sum, d) => sum + d.valor, 0) || 0
      const pendentesMensalidades =
        dues?.filter((d) => d.status === 'PENDENTE').reduce((sum, d) => sum + d.valor, 0) || 0

      const { data: debtorsList } = await supabase
        .from('dues')
        .select(
          `
          *,
          members (nome, email)
        `
        )
        .eq('status', 'PENDENTE')
        .lt('vencimento', now.toISOString())

      setStats({
        saldoCaixa: balance,
        totalMensalidades,
        pagasMensalidades,
        pendentesMensalidades,
        totalDevedores: debtorsList?.length || 0
      })

      setDebtors(debtorsList || [])
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPixKey = async () => {
    try {
      const key = await configService.getPixKey()
      setPixKey(key || '')
    } catch (error) {
      console.error('Erro ao carregar chave PIX:', error)
    }
  }

  const handleSavePixKey = async (e) => {
    e.preventDefault()

    const normalizedPixKey = pixKey.trim()
    if (!normalizedPixKey) {
      alert('Informe uma chave PIX valida.')
      return
    }

    setSavingPix(true)
    try {
      const { error } = await configService.setPixKey(normalizedPixKey)
      if (error) throw error
      alert('Chave PIX atualizada com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar chave PIX:', error)
      alert(`Erro ao salvar chave PIX: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setSavingPix(false)
    }
  }

  if (loading) return <div className="text-center py-8">Carregando...</div>

  const percentualRecebido =
    stats?.totalMensalidades > 0 ? (stats.pagasMensalidades / stats.totalMensalidades) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} />
            <span className="text-xs opacity-90">Saldo Caixa</span>
          </div>
          <p className="text-2xl font-bold">R$ {stats?.saldoCaixa?.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} />
            <span className="text-xs opacity-90">A Receber</span>
          </div>
          <p className="text-2xl font-bold">R$ {stats?.pendentesMensalidades?.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={20} />
            <span className="text-xs opacity-90">Recebido Mes</span>
          </div>
          <p className="text-2xl font-bold">R$ {stats?.pagasMensalidades?.toFixed(2)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} />
            <span className="text-xs opacity-90">Devedores</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalDevedores}</p>
        </div>
      </div>

      {debtors.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="font-bold text-base mb-3 text-red-600">Membros em Atraso</h3>
          <div className="space-y-2">
            {debtors.map((debt) => (
              <div key={debt.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{debt.members?.nome}</p>
                  <p className="text-xs text-gray-500">{debt.competencia}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="font-bold text-red-600">R$ {debt.valor.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {Math.floor((new Date() - new Date(debt.vencimento)) / (1000 * 60 * 60 * 24))} dias
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-bold text-base mb-3">Mensalidades do Mes</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Recebido</span>
              <span className="font-semibold">{percentualRecebido.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-emerald-600 h-3 rounded-full transition-all"
                style={{ width: `${percentualRecebido}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-emerald-50 p-2 rounded">
              <p className="text-xs text-gray-600">Pago</p>
              <p className="font-bold text-emerald-600">R$ {stats?.pagasMensalidades?.toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 p-2 rounded">
              <p className="text-xs text-gray-600">Pendente</p>
              <p className="font-bold text-orange-600">R$ {stats?.pendentesMensalidades?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-bold text-base mb-3">Configuracao da Chave PIX</h3>
        <form onSubmit={handleSavePixKey} className="space-y-3">
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Digite a chave PIX"
            required
          />
          <button
            type="submit"
            disabled={savingPix}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {savingPix ? 'Salvando...' : 'Salvar Chave PIX'}
          </button>
        </form>
      </div>
    </div>
  )
}
