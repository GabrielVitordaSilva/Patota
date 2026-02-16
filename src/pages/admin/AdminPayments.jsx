import { useEffect, useState } from 'react'
import { CheckCircle, X, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { adminService } from '../../services/admin'
import { financeService } from '../../services/finance'
import { supabase } from '../../services/supabaseClient'

export default function AdminPayments() {
  const { member } = useAuth()
  const [payments, setPayments] = useState([])

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    const { data } = await adminService.getPendingPayments()
    setPayments(data || [])
  }

  const handleConfirmPayment = async (paymentId) => {
    await financeService.confirmPayment(paymentId, member.id)
    alert('Pagamento confirmado!')
    loadPayments()
  }

  const handleRejectPayment = async (paymentId) => {
    const motivo = prompt('Motivo da rejeicao:')
    if (!motivo) return

    await supabase.from('payments').delete().eq('id', paymentId)
    alert('Pagamento rejeitado! Avise o membro.')
    loadPayments()
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
        <p className="text-sm text-blue-800">
          <strong>{payments.length}</strong> pagamento(s) aguardando confirmacao
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-3" size={48} />
          <p className="text-gray-600">Nenhum pagamento pendente</p>
        </div>
      ) : (
        payments.map((payment) => (
          <div key={payment.id} className="bg-white rounded-xl shadow-md p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-base text-gray-800">{payment.members?.nome}</p>
                <span className="text-xs text-gray-500">{format(new Date(payment.criado_em), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              <p className="text-sm text-gray-600">{payment.members?.email}</p>
            </div>

            <div className="mb-3 pb-3 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Referente a:</p>
              <p className="font-semibold text-sm text-gray-800">Mensalidade {payment.dues?.competencia}</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">R$ {payment.valor.toFixed(2)}</p>
            </div>

            {payment.comprovante_url && (
              <div className="mb-3">
                <a
                  href={payment.comprovante_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 text-sm font-semibold hover:underline"
                >
                  <ExternalLink size={16} />
                  Ver Comprovante
                </a>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleConfirmPayment(payment.id)}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Confirmar
              </button>
              <button
                onClick={() => handleRejectPayment(payment.id)}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <X size={18} />
                Rejeitar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}