import { useEffect, useState } from 'react'
import { Trophy, TrendingUp } from 'lucide-react'
import { rankingService } from '../services/ranking'

export default function Ranking() {
  const [view, setView] = useState('geral')
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRanking()
  }, [view])

  const loadRanking = async () => {
    setLoading(true)
    try {
      if (view === 'geral') {
        const { data } = await rankingService.getGeneralRanking()
        setRanking(data || [])
      } else {
        const now = new Date()
        const { data } = await rankingService.getMonthlyRanking(now.getFullYear(), now.getMonth() + 1)
        setRanking(data || [])
      }
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
      <h1 className="text-2xl font-bold text-gray-800">Ranking</h1>

      {/* Toggle View */}
      <div className="flex gap-2 bg-white rounded-xl p-2 shadow-md">
        <button
          onClick={() => setView('geral')}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            view === 'geral'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Geral
        </button>
        <button
          onClick={() => setView('mensal')}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            view === 'mensal'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Mensal
        </button>
      </div>

      {/* Ranking List */}
      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : ranking.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Trophy className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">Nenhum dado de ranking ainda</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {ranking.map((member, index) => (
            <div
              key={member.member_id}
              className={`flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0 ${
                index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
              }`}
            >
              <div className="text-2xl font-bold w-12 text-center">
                {getMedalEmoji(index)}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{member.nome}</h3>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp size={20} />
                  <span className="text-2xl font-bold">{member.pontos}</span>
                </div>
                <p className="text-xs text-gray-500">pontos</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Como funciona:</strong> Você ganha +1 ponto por presença em cada jogo. 
          Continue participando para subir no ranking!
        </p>
      </div>
    </div>
  )
}
