import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { eventService } from '../services/events'
import { financeService } from '../services/finance'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const REQUEST_TIMEOUT_MS = 12000
const withTimeout = (promise, ms, timeoutMessage) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    })
  ])

export default function Home() {
  const { member } = useAuth()
  const [nextEvent, setNextEvent] = useState(null)
  const [pendencies, setPendencies] = useState(null)
  const [userRsvp, setUserRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!member?.id) {
      setNextEvent(null)
      setPendencies(null)
      setUserRsvp(null)
      setLoadError('')
      setLoading(false)
      return
    }

    setLoadError('')
    setLoading(true)
    loadData(member)
  }, [member?.id])

  const loadData = async (currentMember) => {
    if (!currentMember?.id) {
      setLoading(false)
      return
    }

    try {
      const { data: event } = await withTimeout(
        eventService.getNextEvent(),
        REQUEST_TIMEOUT_MS,
        'Timeout ao carregar proximo evento'
      )
      setNextEvent(event)

      if (event) {
        const { data: rsvp } = await withTimeout(
          eventService.getUserRSVP(event.id, currentMember.id),
          REQUEST_TIMEOUT_MS,
          'Timeout ao carregar RSVP'
        )
        setUserRsvp(rsvp?.status || null)
      } else {
        setUserRsvp(null)
      }

      const pendenciesData = await withTimeout(
        financeService.getUserPendencies(currentMember.id),
        REQUEST_TIMEOUT_MS,
        'Timeout ao carregar pendencias'
      )
      setPendencies(pendenciesData)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoadError('Nao foi possivel atualizar os dados agora. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPresence = async (status) => {
    if (!nextEvent || !member) return

    try {
      await eventService.confirmPresence(nextEvent.id, member.id, status)
      setUserRsvp(status)
    } catch (error) {
      console.error('Error confirming presence:', error)
    }
  }

  const copyPix = () => {
    const pixKey = 'seupix@exemplo.com'
    navigator.clipboard.writeText(pixKey)
    alert('Chave PIX copiada!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Carregando...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          onClick={() => {
            if (!member?.id) return
            setLoadError('')
            setLoading(true)
            loadData(member)
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {nextEvent && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-emerald-600" size={28} />
            <h2 className="text-xl font-bold text-gray-800">Proximo Jogo</h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {format(parseISO(nextEvent.data_hora), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-lg text-gray-600">
                {format(parseISO(nextEvent.data_hora), 'HH:mm')}h - {nextEvent.local}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle size={16} />
              <span>{nextEvent.event_rsvp?.filter((r) => r.status === 'VOU').length || 0} confirmados</span>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Voce vai?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleConfirmPresence('VOU')}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    userRsvp === 'VOU'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Vou
                </button>
                <button
                  onClick={() => handleConfirmPresence('NAO_VOU')}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    userRsvp === 'NAO_VOU'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Nao vou
                </button>
                <button
                  onClick={() => handleConfirmPresence('TALVEZ')}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    userRsvp === 'TALVEZ'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Talvez
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendencies && pendencies.total > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-orange-600" size={28} />
            <h2 className="text-xl font-bold text-gray-800">Voce tem pendencias</h2>
          </div>

          <div className="space-y-3">
            {pendencies.dues.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Mensalidades pendentes</span>
                <span className="text-lg font-bold text-orange-600">
                  R$ {pendencies.dues.reduce((sum, d) => sum + d.valor, 0).toFixed(2)}
                </span>
              </div>
            )}

            {pendencies.fines.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Multas pendentes</span>
                <span className="text-lg font-bold text-orange-600">
                  R$ {pendencies.fines.reduce((sum, f) => sum + f.valor, 0).toFixed(2)}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-orange-600">R$ {pendencies.total.toFixed(2)}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyPix}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  Copiar PIX
                </button>
                <Link
                  to="/finance"
                  className="flex-1 bg-white text-emerald-600 border-2 border-emerald-600 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition text-center"
                >
                  Ver Detalhes
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendencies && pendencies.total === 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-emerald-600" size={28} />
            <div>
              <h3 className="text-xl font-bold text-gray-800">Tudo em dia!</h3>
              <p className="text-gray-600">Voce nao tem pendencias financeiras.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/events" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <Calendar className="text-emerald-600 mb-3" size={32} />
          <h3 className="font-bold text-gray-800">Eventos</h3>
          <p className="text-sm text-gray-600">Ver todos os jogos</p>
        </Link>

        <Link to="/ranking" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <DollarSign className="text-emerald-600 mb-3" size={32} />
          <h3 className="font-bold text-gray-800">Ranking</h3>
          <p className="text-sm text-gray-600">Ver classificacao</p>
        </Link>
      </div>
    </div>
  )
}
