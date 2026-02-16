import { useEffect, useState } from 'react'
import { DollarSign, AlertCircle, Trophy } from 'lucide-react'
import { configService } from '../services/config'

export default function Rules() {
  const [pixKey, setPixKey] = useState('seupix@exemplo.com')

  useEffect(() => {
    loadPixKey()
  }, [])

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Regras CCC</h1>

      <div className="bg-emerald-600 text-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-3">Chave PIX</h2>
        <p className="mb-4 font-mono text-lg break-all">{pixKey}</p>
        <button
          onClick={copyPix}
          className="w-full bg-white text-emerald-600 py-3 rounded-lg font-bold hover:bg-emerald-50 transition"
        >
          Copiar Chave
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="text-emerald-600" size={28} />
          <h2 className="text-xl font-bold text-gray-800">Mensalidade</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-700">Valor</span>
            <span className="font-bold text-emerald-600 text-xl">R$ 35,00</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-700">Vencimento</span>
            <span className="font-semibold text-gray-800">Todo dia 10</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>Isencao:</strong> Lesao ou trabalho podem isentar a mensalidade do mes. Fale com um admin.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="text-orange-600" size={28} />
          <h2 className="text-xl font-bold text-gray-800">Multas</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-800">Atraso</p>
              <p className="text-sm text-gray-600">Chegar atrasado ao jogo</p>
            </div>
            <span className="font-bold text-orange-600">R$ 5,00</span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-800">Falta Confirmada</p>
              <p className="text-sm text-gray-600">Confirmar "Vou" e faltar</p>
            </div>
            <span className="font-bold text-orange-600">R$ 10,00</span>
          </div>

          <div className="flex justify-between items-center py-3">
            <div>
              <p className="font-semibold text-gray-800">Convidado</p>
              <p className="text-sm text-gray-600">Por cada convidado levado</p>
            </div>
            <span className="font-bold text-orange-600">R$ 5,00</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-yellow-600" size={28} />
          <h2 className="text-xl font-bold text-gray-800">Sistema de Pontos</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="font-semibold text-gray-800">Presenca em Jogo</p>
              <p className="text-sm text-gray-600">Por cada jogo que voce participa</p>
            </div>
            <span className="font-bold text-emerald-600">+1 ponto</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-yellow-800">
            <strong>Ranking:</strong> Acompanhe sua posicao na aba Ranking. Quanto mais voce joga, mais pontos acumula!
          </p>
        </div>
      </div>

      <div className="bg-gray-100 rounded-xl p-6">
        <h3 className="font-bold text-gray-800 mb-3">Observacoes Importantes</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>Todas as multas entram no caixa da patota</li>
          <li>O dinheiro do caixa e usado para despesas coletivas (campo, materiais, etc)</li>
          <li>Mantenha seus pagamentos em dia para evitar bloqueios</li>
          <li>Sempre confirme sua presenca com antecedencia</li>
          <li>Em caso de duvidas, fale com os administradores</li>
        </ul>
      </div>
    </div>
  )
}