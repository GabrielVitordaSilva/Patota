import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { adminService } from '../../services/admin'
import { financeService } from '../../services/finance'

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
    if (!confirm('Confirmar este pagamento?')) return
    
    await financeService.confirmPayment(paymentId, member.id)
    alert('Pagamento confirmado!')
    loadPayments()
  }

  return (
    <div className="space-y-4">
      {payments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-3" size={48} />
          <p className="text-gray-600">Nenhum pagamento pendente</p>
        </div>
      ) : (
        payments.map((payment) => (
          <div key={payment.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="mb-4">
              <p className="font-bold text-lg text-gray-800">{payment.members.nome}</p>
              <p className="text-sm text-gray-600">{payment.members.email}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">Referente a:</p>
              <p className="font-semibold text-gray-800">
                Mensalidade {payment.dues.competencia}
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                R$ {payment.valor.toFixed(2)}
              </p>
            </div>
            
            {payment.comprovante_url && (
              <div className="mb-4">
                <a
                  href={payment.comprovante_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  Ver Comprovante
                </a>
              </div>
            )}
            
            <button
              onClick={() => handleConfirmPayment(payment.id)}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Confirmar Pagamento
            </button>
          </div>
        ))
      )}
    </div>
  )
}
