import { useEffect, useState } from 'react'
import { useLiveData } from '../hooks'
import { Trophy, TrendingUp } from 'lucide-react'
import { rankingService } from '../services/ranking'

export default function Ranking() {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRanking()
  }, [])

  useLiveData(['points_ledger', 'events'], () => loadRanking(true))

  const loadRanking = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await rankingService.getGeneralRanking()
      setRanking(data || [])
    } catch (error) {
      console.error('Error loading ranking:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMedalEmoji = (position) => {
    if (position === 0) return '🥇'
    if (position === 1) return '🥈'
    if (position === 2) return '🥉'
    return `${position + 1}º`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-900">Ranking</h1>

      {/* Ranking List */}
      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : ranking.length === 0 ? (
        <div className="ui-card p-8 text-center">
          <Trophy className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">Nenhum dado de ranking ainda</p>
        </div>
      ) : (
        <div className="ui-card overflow-hidden" data-tour="ranking">
          {ranking.map((member, index) => (
            <div
              key={member.member_id}
              className={`flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0 ${
                index < 3 ? 'bg-amber-50' : ''
              }`}
            >
              <div className="text-2xl font-bold w-12 text-center">
                {getMedalEmoji(index)}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{member.nome}</h3>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end text-emerald-600 mb-1">
                  <TrendingUp size={20} />
                  <span className="text-2xl font-bold">{member.pontos}</span>
                </div>
                <p className="text-xs text-gray-500">{member.totalGols || 0} gols</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Como funciona:</strong> Estando presente no jogo, você ganha os gols que o seu time marcou.
          Ex: se o seu time venceu por 8 a 6, você ganha 8 pontos e cada jogador do outro time ganha 6.
        </p>
      </div>
    </div>
  )
}
