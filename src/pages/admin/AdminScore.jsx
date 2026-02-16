import { useState } from 'react'
import { X, Trophy } from 'lucide-react'
import { teamsService } from '../../services/teams'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminScore({ event, onClose, onSuccess }) {
  const { member } = useAuth()
  const [placarPreto, setPlacarPreto] = useState(event.placar_preto || '')
  const [placarBranco, setPlacarBranco] = useState(event.placar_branco || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    const preto = parseInt(placarPreto, 10) || 0
    const branco = parseInt(placarBranco, 10) || 0

    if (
      !confirm(
        `Confirmar placar?\n\nTime Preto: ${preto}\nTime Branco: ${branco}\n\nIsso distribuira pontos para todos os jogadores!`
      )
    ) {
      return
    }

    setLoading(true)
    try {
      let result
      if (event.placar_finalizado) {
        result = await teamsService.editScore(event.id, preto, branco, member.id)
      } else {
        result = await teamsService.registerScore(event.id, preto, branco, member.id)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8">
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold text-gray-800">{event.placar_finalizado ? 'Editar' : 'Placar'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-xs md:text-sm text-blue-800 mb-1">{new Date(event.data_hora).toLocaleDateString('pt-BR')}</p>
            <p className="text-xs md:text-sm text-blue-800 truncate">{event.local}</p>
          </div>

          {event.placar_finalizado && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-800 font-semibold">Editar recalculara os pontos</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-900 text-white rounded-xl p-3 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm md:text-base">TIME PRETO</h4>
                <span className="text-xs">{times?.preto?.length || 0} jogadores</span>
              </div>

              <div className="mb-3">
                <label className="block text-xs mb-2">Gols Marcados</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="99"
                  value={placarPreto}
                  onChange={(e) => setPlacarPreto(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 text-3xl md:text-4xl font-bold text-center text-gray-900 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                  required
                />
              </div>

              <div className="text-xs opacity-75 line-clamp-2">{times?.preto?.map((j) => j.nome).join(', ')}</div>
            </div>

            <div className="text-center -my-2">
              <span className="inline-block px-3 py-1 bg-gray-200 rounded-full font-bold text-sm text-gray-700">VS</span>
            </div>

            <div className="bg-white border-2 border-gray-300 rounded-xl p-3 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm md:text-base text-gray-800">TIME BRANCO</h4>
                <span className="text-xs text-gray-600">{times?.branco?.length || 0} jogadores</span>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-gray-700 mb-2">Gols Marcados</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="99"
                  value={placarBranco}
                  onChange={(e) => setPlacarBranco(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 text-3xl md:text-4xl font-bold text-center text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                  required
                />
              </div>

              <div className="text-xs text-gray-600 line-clamp-2">{times?.branco?.map((j) => j.nome).join(', ')}</div>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-800 mb-2">Distribuicao de Pontos:</p>
              <div className="space-y-1 text-xs text-emerald-700">
                <p>
                  Time Preto: <strong>+{placarPreto || 0} pontos cada</strong>
                </p>
                <p>
                  Time Branco: <strong>+{placarBranco || 0} pontos cada</strong>
                </p>
                <p className="mt-2 pt-2 border-t border-emerald-300 font-bold">
                  {(parseInt(placarPreto, 10) || 0) > (parseInt(placarBranco, 10) || 0)
                    ? 'Time Preto vence!'
                    : (parseInt(placarBranco, 10) || 0) > (parseInt(placarPreto, 10) || 0)
                      ? 'Time Branco vence!'
                      : 'Empate!'}
                </p>
              </div>
            </div>
          </form>
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 ui-btn-secondary text-sm md:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !placarPreto || !placarBranco}
              className="flex-1 ui-btn-primary text-sm md:text-base"
            >
              <Trophy size={18} />
              {loading ? 'Salvando...' : event.placar_finalizado ? 'Atualizar' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
