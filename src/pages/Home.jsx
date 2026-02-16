import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, DollarSign, AlertCircle, CheckCircle, Share2, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { configService } from '../services/config'
import { eventService } from '../services/events'
import { financeService } from '../services/finance'
import { teamsService } from '../services/teams'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Home() {
  const { member } = useAuth()
  const [nextEvent, setNextEvent] = useState(null)
  const [pendencies, setPendencies] = useState(null)
  const [userRsvp, setUserRsvp] = useState(null)
  const [pixKey, setPixKey] = useState('seupix@exemplo.com')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [confirmationOpen, setConfirmationOpen] = useState(true)
  const [dataLimite, setDataLimite] = useState(null)
  const [teams, setTeams] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPixKey()
  }, [])

  useEffect(() => {
    loadData()
  }, [member?.id])

  const loadPixKey = async () => {
    try {
      const key = await configService.getPixKey()
      if (key) setPixKey(key)
    } catch (error) {
      console.error('Error loading PIX key:', error)
    }
  }

  const loadData = async () => {
    if (!member?.id) {
      setNextEvent(null)
      setPendencies(null)
      setUserRsvp(null)
      setTeams(null)
      setConfirmationOpen(false)
      setDataLimite(null)
      setLoading(false)
      return
    }

    try {
      const { data: event } = await eventService.getNextEvent()
      setNextEvent(event)

      if (event) {
        const isOpen = await teamsService.isConfirmationOpen(event.id)
        setConfirmationOpen(isOpen)
        setDataLimite(event.data_limite_confirmacao || null)

        const { data: rsvp } = await eventService.getUserRSVP(event.id, member.id)
        setUserRsvp(rsvp?.status || null)

        const teamsData = await teamsService.getTeams(event.id)
        if (teamsData?.times_gerados && teamsData.times_json) {
          setTeams(teamsData.times_json)
        } else {
          setTeams(null)
        }
      } else {
        setConfirmationOpen(false)
        setDataLimite(null)
        setTeams(null)
      }

      const pendenciesData = await financeService.getUserPendencies(member.id)
      setPendencies(pendenciesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPresence = async (status) => {
    if (!nextEvent || !member) return

    if (!confirmationOpen) {
      alert('O prazo para confirmacao encerrou!')
      return
    }

    if (status === 'VOU' && userRsvp !== 'VOU') {
      setSelectedStatus(status)
      setShowConfirmModal(true)
      return
    }

    try {
      await eventService.confirmPresence(nextEvent.id, member.id, status)
      setUserRsvp(status)
    } catch (error) {
      console.error('Error confirming presence:', error)
    }
  }

  const confirmPresenceAfterModal = async () => {
    if (!nextEvent || !member || !selectedStatus) return

    try {
      await eventService.confirmPresence(nextEvent.id, member.id, selectedStatus)
      setUserRsvp(selectedStatus)
      setShowConfirmModal(false)
      setSelectedStatus(null)
    } catch (error) {
      console.error('Error confirming presence:', error)
    }
  }

  const shareOnWhatsApp = () => {
    if (!teams || !nextEvent) return

    const texto = teamsService.generateWhatsAppText(nextEvent, teams)
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const copyPix = () => {
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

            {dataLimite && confirmationOpen && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Clock size={16} />
                  <span className="font-semibold">
                    Confirmacoes abertas ate {format(parseISO(dataLimite), "dd/MM 'as' HH:mm")}
                  </span>
                </div>
              </div>
            )}

            {!confirmationOpen && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800 font-semibold">Confirmacoes encerradas</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle size={16} />
              <span>{nextEvent.event_rsvp?.filter((r) => r.status === 'VOU').length || 0} confirmados</span>
            </div>

            {confirmationOpen ? (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Voce vai?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleConfirmPresence('VOU')}
                    className={`flex-1 py-3 rounded-lg font-semibold transition ${
                      userRsvp === 'VOU' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Vou
                  </button>
                  <button
                    onClick={() => handleConfirmPresence('NAO_VOU')}
                    className={`flex-1 py-3 rounded-lg font-semibold transition ${
                      userRsvp === 'NAO_VOU' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Nao vou
                  </button>
                  <button
                    onClick={() => handleConfirmPresence('TALVEZ')}
                    className={`flex-1 py-3 rounded-lg font-semibold transition ${
                      userRsvp === 'TALVEZ' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Talvez
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Sua resposta: <strong>{userRsvp || 'Nao confirmou'}</strong>
                </p>
              </div>
            )}

            {teams && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">Times Sorteados</h3>
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition"
                  >
                    <Share2 size={16} />
                    WhatsApp
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 text-white rounded-lg p-3">
                    <p className="font-bold text-sm mb-2 text-center">TIME PRETO</p>
                    <div className="space-y-1">
                      {teams.preto?.map((jogador, i) => (
                        <div key={jogador.member_id} className="text-xs py-1 px-2 bg-gray-800 rounded flex items-center gap-2">
                          <span className="font-semibold">{i + 1}.</span>
                          <span className="truncate">{jogador.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border-2 border-gray-300 rounded-lg p-3">
                    <p className="font-bold text-sm mb-2 text-center text-gray-800">TIME BRANCO</p>
                    <div className="space-y-1">
                      {teams.branco?.map((jogador, i) => (
                        <div key={jogador.member_id} className="text-xs py-1 px-2 bg-gray-100 rounded flex items-center gap-2">
                          <span className="font-semibold">{i + 1}.</span>
                          <span className="truncate">{jogador.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-gray-500 mt-3">
                  Total: {(teams.preto?.length || 0) + (teams.branco?.length || 0)} jogadores
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && nextEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirmar Presenca</h3>
              <p className="text-gray-600">Tem certeza que vai participar do jogo?</p>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-emerald-600" size={20} />
                <p className="font-bold text-gray-800">
                  {format(parseISO(nextEvent.data_hora), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <p className="text-gray-700 ml-7">{format(parseISO(nextEvent.data_hora), 'HH:mm')}h - {nextEvent.local}</p>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-800 font-semibold mb-2">Atencao</p>
              <p className="text-sm text-orange-700">
                Se voce confirmar presenca e faltar, sera cobrada uma multa de <strong>R$ 10,00</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedStatus(null)
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPresenceAfterModal}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
              >
                Sim, Vou!
              </button>
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

      <div className="grid grid-cols-2 gap-4">
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