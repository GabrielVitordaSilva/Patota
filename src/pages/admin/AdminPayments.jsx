import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, X, ExternalLink, ArrowLeft, Image as ImageIcon, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { financeService } from '../../services/finance'
import { supabase } from '../../services/supabaseClient'

const isImageUrl = (url = '') => /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url)

export default function AdminPayments() {
  const { member } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [processingPaymentId, setProcessingPaymentId] = useState(null)

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('payments')
      .select(
        `
        *,
        members (nome, email),
        dues (competencia, valor),
        fines (tipo, valor, events(data_hora, local))
      `
      )
      .eq('status', 'PENDENTE')
      .order('criado_em', { ascending: true })

    setPayments(data || [])
    setLoading(false)
  }

  const handleConfirmPayment = async (payment) => {
    setProcessingPaymentId(payment.id)

    try {
      if (payment.due_id) {
        await financeService.confirmPayment(payment.id, member.id)
      } else if (payment.fine_id) {
        await financeService.confirmFinePayment(payment.id, member.id)
      }

      alert('Pagamento confirmado!')
      setSelectedReceipt(null)
      await loadPayments()
    } finally {
      setProcessingPaymentId(null)
    }
  }

  const handleRejectPayment = async (paymentId) => {
    const motivo = prompt('Motivo da rejeicao:')
    if (!motivo) return

    setProcessingPaymentId(paymentId)

    try {
      await supabase.from('payments').delete().eq('id', paymentId)
      alert(`Pagamento rejeitado! Avise o membro sobre: ${motivo}`)
      setSelectedReceipt(null)
      await loadPayments()
    } finally {
      setProcessingPaymentId(null)
    }
  }

  const getPaymentType = (payment) => {
    if (payment.due_id) {
      return {
        tipo: 'Mensalidade',
        referencia: payment.dues?.competencia,
        icon: '[MENS]'
      }
    }

    if (payment.fine_id) {
      const fineType = payment.fines?.tipo || 'MULTA'
      return {
        tipo: fineType.replace('_', ' '),
        referencia: payment.fines?.events?.data_hora
          ? new Date(payment.fines.events.data_hora).toLocaleDateString('pt-BR')
          : 'Sem evento',
        icon: fineType === 'ATRASO' ? '[ATR]' : fineType === 'FALTA_CONFIRMADA' ? '[FAL]' : '[CONV]'
      }
    }

    return {
      tipo: 'Pagamento',
      referencia: '-',
      icon: '[PGTO]'
    }
  }

  const selectedReceiptIsImage = useMemo(
    () => isImageUrl(selectedReceipt?.comprovante_url),
    [selectedReceipt]
  )

  if (selectedReceipt) {
    const paymentInfo = getPaymentType(selectedReceipt)

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedReceipt(null)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft size={18} />
          Voltar para pagamentos
        </button>

        <div className="ui-card p-4 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-base text-gray-800">{selectedReceipt.members?.nome}</p>
              <p className="text-sm text-gray-600">{paymentInfo.tipo} - {paymentInfo.referencia}</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">R$ {selectedReceipt.valor.toFixed(2)}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            {selectedReceiptIsImage ? (
              <img
                src={selectedReceipt.comprovante_url}
                alt={`Comprovante de ${selectedReceipt.members?.nome}`}
                className="max-h-[70vh] w-full rounded-lg object-contain bg-white"
              />
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
                <FileText size={42} className="text-gray-500" />
                <div>
                  <p className="font-semibold text-gray-800">Visualizacao incorporada indisponivel para este arquivo.</p>
                  <p className="text-sm text-gray-500">Use o link abaixo para abrir o comprovante em outra aba sem perder esta tela.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={selectedReceipt.comprovante_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <ExternalLink size={16} />
              Abrir em nova aba
            </a>

            <button
              onClick={() => handleConfirmPayment(selectedReceipt)}
              disabled={processingPaymentId === selectedReceipt.id}
              className="ui-btn-primary disabled:opacity-60"
            >
              <CheckCircle size={18} />
              {processingPaymentId === selectedReceipt.id ? 'Confirmando...' : 'Confirmar'}
            </button>

            <button
              onClick={() => handleRejectPayment(selectedReceipt.id)}
              disabled={processingPaymentId === selectedReceipt.id}
              className="ui-btn-danger disabled:opacity-60"
            >
              <X size={18} />
              Rejeitar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
        <p className="text-sm text-blue-800">
          <strong>{payments.length}</strong> pagamento(s) aguardando confirmacao
        </p>
      </div>

      {loading ? (
        <div className="ui-card p-8 text-center text-gray-600">Carregando pagamentos...</div>
      ) : payments.length === 0 ? (
        <div className="ui-card p-8 text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-3" size={48} />
          <p className="text-gray-600">Nenhum pagamento pendente</p>
        </div>
      ) : (
        payments.map((payment) => {
          const paymentInfo = getPaymentType(payment)
          const isProcessing = processingPaymentId === payment.id

          return (
            <div key={payment.id} className="ui-card p-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <p className="font-bold text-base text-gray-800">{payment.members?.nome}</p>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{format(new Date(payment.criado_em), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <p className="text-sm text-gray-600">{payment.members?.email}</p>
              </div>

              <div className="mb-3 pb-3 border-b border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Referente a:</p>
                <p className="font-semibold text-sm text-gray-800">
                  {paymentInfo.icon} {paymentInfo.tipo} - {paymentInfo.referencia}
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">R$ {payment.valor.toFixed(2)}</p>
              </div>

              {payment.comprovante_url && (
                <div className="mb-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(payment)}
                    className="inline-flex items-center gap-2 text-emerald-700 text-sm font-semibold hover:underline"
                  >
                    {isImageUrl(payment.comprovante_url) ? <ImageIcon size={16} /> : <FileText size={16} />}
                    Ver comprovante sem sair da tela
                  </button>
                  <a
                    href={payment.comprovante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 text-sm font-semibold hover:underline"
                  >
                    <ExternalLink size={16} />
                    Abrir em nova aba
                  </a>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirmPayment(payment)}
                  disabled={isProcessing}
                  className="flex-1 ui-btn-primary disabled:opacity-60"
                >
                  <CheckCircle size={18} />
                  {isProcessing ? 'Confirmando...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => handleRejectPayment(payment.id)}
                  disabled={isProcessing}
                  className="flex-1 ui-btn-danger disabled:opacity-60"
                >
                  <X size={18} />
                  {isProcessing ? 'Processando...' : 'Rejeitar'}
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
