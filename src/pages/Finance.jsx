import { useEffect, useState } from 'react'
import { DollarSign, AlertCircle, CheckCircle, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { financeService } from '../services/finance'
import { format, parseISO } from 'date-fns'

export default function Finance() {
  const { member } = useAuth()
  const [dues, setDues] = useState([])
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    if (!member?.id) {
      setDues([])
      setFines([])
      setLoading(false)
      return
    }

    setLoading(true)
    loadData(member.id)
  }, [member?.id])

  const loadData = async (memberId) => {
    if (!memberId) {
      setLoading(false)
      return
    }

    try {
      const { data: duesData } = await financeService.getUserDues(memberId)
      const { data: finesData } = await financeService.getUserFines(memberId)
      
      setDues(duesData || [])
      setFines(finesData || [])
    } catch (error) {
      console.error('Error loading finance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyPix = () => {
    const pixKey = 'seupix@exemplo.com'
    navigator.clipboard.writeText(pixKey)
    alert('Chave PIX copiada!')
  }

  const handleFileUpload = async (dueId, file) => {
    if (!file || !member) return

    setUploadingFile(true)
    try {
      // Upload do comprovante
      const { data: url, error } = await financeService.uploadComprovante(file, member.id)
      
      if (error) {
        alert('Erro ao fazer upload')
        return
      }

      // Criar pagamento com comprovante
      const due = dues.find(d => d.id === dueId)
      await financeService.createPayment(member.id, dueId, due.valor, url)
      
      alert('Comprovante enviado! Aguarde confirmação do admin.')
      loadData(member.id)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erro ao enviar comprovante')
    } finally {
      setUploadingFile(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  const pendingDues = dues.filter(d => d.status === 'PENDENTE')
  const pendingFines = fines.filter(f => !f.pago)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Meu Financeiro</h1>

      {/* Botão Copiar PIX */}
      <button
        onClick={copyPix}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-md"
      >
        📋 Copiar Chave PIX
      </button>

      {/* Mensalidades */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Mensalidades</h2>
        
        {pendingDues.length === 0 ? (
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle size={24} />
            <span>Todas as mensalidades estão em dia!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDues.map((due) => (
              <div key={due.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">
                    {format(parseISO(due.competencia), 'MMMM/yyyy')}
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    R$ {due.valor.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Vencimento: {format(parseISO(due.vencimento), 'dd/MM/yyyy')}
                </p>
                
                <label className="block">
                  <div className="flex items-center gap-2 bg-white border-2 border-emerald-600 text-emerald-600 py-2 px-4 rounded-lg cursor-pointer hover:bg-emerald-50 transition">
                    <Upload size={20} />
                    <span className="font-semibold">Enviar Comprovante</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(due.id, e.target.files[0])}
                    disabled={uploadingFile}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Histórico */}
        {dues.filter(d => d.status !== 'PENDENTE').length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">Histórico</h3>
            <div className="space-y-2">
              {dues
                .filter(d => d.status !== 'PENDENTE')
                .map((due) => (
                  <div key={due.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">
                      {format(parseISO(due.competencia), 'MMMM/yyyy')}
                    </span>
                    <span className={`font-semibold ${
                      due.status === 'PAGO' ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {due.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Multas */}
      {fines.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Multas</h2>
          
          <div className="space-y-3">
            {fines.map((fine) => (
              <div key={fine.id} className={`rounded-lg p-4 ${
                fine.pago ? 'bg-gray-50 border border-gray-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">
                    {fine.tipo.replace('_', ' ')}
                  </span>
                  <span className={`text-lg font-bold ${fine.pago ? 'text-gray-600' : 'text-red-600'}`}>
                    R$ {fine.valor.toFixed(2)}
                  </span>
                </div>
                {fine.obs && (
                  <p className="text-sm text-gray-600">{fine.obs}</p>
                )}
                {fine.pago && (
                  <span className="inline-block mt-2 text-xs text-emerald-600 font-semibold">✓ PAGO</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
