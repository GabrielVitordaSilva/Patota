import { useState } from 'react'
import { X, Trophy } from 'lucide-react'
import { teamsService } from '../../services/teams'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminScore({ event, onClose, onSuccess }) {
  const { member } = useAuth()
  const [placarPreto, setPlacarPreto] = useState(event.placar_preto || 0)
  const [placarBranco, setPlacarBranco] = useState(event.placar_branco || 0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (
      !confirm(
        `Confirmar placar?\n\nTime Preto: ${placarPreto}\nTime Branco: ${placarBranco}\n\nIsso distribuira pontos para todos os jogadores!`
      )
    ) {
      return
    }

    setLoading(true)
    try {
      let result
      if (event.placar_finalizado) {
        result = await teamsService.editScore(event.id, placarPreto, placarBranco, member?.id)
      } else {
        result = await teamsService.registerScore(event.id, placarPreto, placarBranco, member?.id)
      }

      if (result.error) {
        alert(`Erro: ${result.error}`)
      } else {
        const vencedor = result.data.vencedor
        const msg = vencedor === 'EMPATE' ? 'Empate!' : `Time ${vencedor} venceu!`
        alert(`Placar registrado!\n\n${msg}\n\nPontos distribuidos para todos os jogadores.`)
        onSuccess()
        onClose()
      }
    } catch (error) {
      alert('Erro ao registrar placar')
    } finally {
      setLoading(false)
    }
  }

  const times = event.times_json

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">{event.placar_finalizado ? 'Editar Placar' : 'Registrar Placar'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800 mb-1">{new Date(event.data_hora).toLocaleDateString('pt-BR')}</p>
          <p className="text-sm text-blue-800">{event.local}</p>
        </div>

        {event.placar_finalizado && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 font-semibold">Este jogo ja teve pontos distribuidos. Editar recalculara tudo.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-900 text-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">TIME PRETO</h4>
              <span className="text-xs">{times?.preto?.length || 0} jogadores</span>
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-2">Gols Marcados</label>
              <input
                type="number"
                min="0"
                value={placarPreto}
                onChange={(e) => setPlacarPreto(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-3 text-3xl font-bold text-center text-gray-900 rounded-lg"
                required
              />
            </div>

            <div className="text-xs opacity-75">{times?.preto?.map((j) => j.nome).join(', ')}</div>
          </div>

          <div className="text-center">
            <span className="inline-block px-4 py-2 bg-gray-200 rounded-full font-bold text-gray-700">VS</span>
          </div>

          <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-800">TIME BRANCO</h4>
              <span className="text-xs text-gray-600">{times?.branco?.length || 0} jogadores</span>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-2">Gols Marcados</label>
              <input
                type="number"
                min="0"
                value={placarBranco}
                onChange={(e) => setPlacarBranco(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-3 text-3xl font-bold text-center text-gray-900 border-2 border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="text-xs text-gray-600">{times?.branco?.map((j) => j.nome).join(', ')}</div>
          </div>

          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800 font-semibold mb-2">Distribuicao de Pontos:</p>
            <div className="space-y-1 text-sm text-emerald-700">
              <p>
                Cada jogador do Time Preto: <strong>+{placarPreto} pontos</strong>
              </p>
              <p>
                Cada jogador do Time Branco: <strong>+{placarBranco} pontos</strong>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trophy size={20} />
              {loading ? 'Salvando...' : event.placar_finalizado ? 'Atualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
