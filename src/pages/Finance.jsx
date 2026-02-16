import { useEffect, useState } from 'react'
import { CheckCircle, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { configService } from '../services/config'
import { financeService } from '../services/finance'
import { format, parseISO } from 'date-fns'

const getStatusBadge = (status) => {
  switch (status) {
    case 'PENDENTE':
      return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Pendente</span>
    case 'PAGO':
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Pago</span>
    case 'ISENTO':
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Isento</span>
    default:
      return null
  }
}

export default function Finance() {
  const { member } = useAuth()
  const [dues, setDues] = useState([])
  const [fines, setFines] = useState([])
  const [pixKey, setPixKey] = useState('seupix@exemplo.com')
  const [loading, setLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => {
    loadPixKey()
  }, [])

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

  const loadPixKey = async () => {
    try {
      const key = await configService.getPixKey()
      if (key) setPixKey(key)
    } catch (error) {
      console.error('Error loading PIX key:', error)
    }
  }

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey)
    alert('Chave PIX copiada!')
  }

  const handleFileUpload = async (dueId, file) => {
    if (!file || !member) return

    setUploadingFile(true)
    try {
      const { data: url, error } = await financeService.uploadComprovante(file, member.id)

      if (error) {
        alert('Erro ao fazer upload')
        return
      }

      const due = dues.find((d) => d.id === dueId)
      await financeService.createPayment(member.id, dueId, due.valor, url)

      alert('Comprovante enviado! Aguarde confirmacao do admin.')
      loadData(member.id)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erro ao enviar comprovante')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleFinePayment = async (fineId, valor, file) => {
    if (!file || !member) return

    setUploadingFile(true)
    try {
      const { data: url, error } = await financeService.uploadComprovante(file, member.id)

      if (error) {
        alert('Erro ao fazer upload')
        return
      }

      await financeService.createFinePayment(member.id, fineId, valor, url)

      alert('Comprovante enviado! Aguarde confirmacao do admin.')
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

  const pendingDues = dues.filter((d) => d.status === 'PENDENTE')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Meu Financeiro</h1>

      <button
        onClick={copyPix}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-md"
      >
        Copiar Chave PIX
      </button>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Mensalidades</h2>

        {pendingDues.length === 0 ? (
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle size={24} />
            <span>Todas as mensalidades estao em dia!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDues.map((due) => (
              <div key={due.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">{format(parseISO(`${due.competencia}-01`), 'MMMM/yyyy')}</span>
                  <span className="text-lg font-bold text-orange-600">R$ {due.valor.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">Vencimento: {format(parseISO(due.vencimento), 'dd/MM/yyyy')}</p>

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

        {dues.filter((d) => d.status !== 'PENDENTE').length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">Historico</h3>
            <div className="space-y-2">
              {dues
                .filter((d) => d.status !== 'PENDENTE')
                .map((due) => (
                  <div key={due.id} className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-800">{format(parseISO(`${due.competencia}-01`), 'MMMM/yyyy')}</p>
                      {due.payments && due.payments.length > 0 && (
                        <p className="text-xs text-gray-500">Pago em: {format(new Date(due.payments[0].criado_em), 'dd/MM/yyyy')}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {getStatusBadge(due.status)}
                      <p className="text-sm font-semibold text-gray-600 mt-1">R$ {due.valor.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {fines.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Multas</h2>

          <div className="space-y-3">
            {fines.map((fine) => (
              <div
                key={fine.id}
                className={`rounded-lg p-4 ${
                  fine.pago ? 'bg-gray-50 border border-gray-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {fine.tipo === 'ATRASO' && 'Atraso'}
                      {fine.tipo === 'FALTA_CONFIRMADA' && 'Falta Confirmada'}
                      {fine.tipo === 'CONVIDADO' && 'Convidado'}
                    </p>
                    {fine.events && (
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(fine.events.data_hora).toLocaleDateString('pt-BR')} - {fine.events.local}
                      </p>
                    )}
                    {fine.obs && <p className="text-xs text-gray-600 mt-1">{fine.obs}</p>}
                  </div>
                  <span className={`text-lg font-bold ml-3 ${fine.pago ? 'text-gray-600' : 'text-red-600'}`}>
                    R$ {fine.valor.toFixed(2)}
                  </span>
                </div>

                {fine.pago ? (
                  <span className="inline-block text-xs text-emerald-600 font-semibold bg-emerald-100 px-3 py-1 rounded-full">
                    PAGO
                  </span>
                ) : (
                  <label className="block mt-3">
                    <div className="flex items-center gap-2 bg-white border-2 border-emerald-600 text-emerald-600 py-2 px-4 rounded-lg cursor-pointer hover:bg-emerald-50 transition">
                      <Upload size={18} />
                      <span className="font-semibold text-sm">Enviar Comprovante</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFinePayment(fine.id, fine.valor, e.target.files[0])}
                      disabled={uploadingFile}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
