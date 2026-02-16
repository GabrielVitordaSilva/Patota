import { useEffect, useMemo, useState } from 'react'
import { Plus, Check, X, Clock, Stethoscope, Pencil, Trash2, Users, Shuffle, RotateCcw, Trophy } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { eventService } from '../../services/events'
import { adminService } from '../../services/admin'
import { teamsService } from '../../services/teams'
import AdminScore from './AdminScore'

const toDatetimeLocal = (value) => {
  if (!value) return ''

  const date = new Date(value)
  const pad = (num) => String(num).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

export default function AdminEvents() {
  const { member } = useAuth()
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [scoringEvent, setScoringEvent] = useState(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [scoreEventId, setScoreEventId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scoreSaving, setScoreSaving] = useState(false)
  const [formState, setFormState] = useState({
    tipo: 'JOGO',
    data_hora: '',
    data_limite_confirmacao: '',
    local: ''
  })
  const [scoreFormState, setScoreFormState] = useState({
    time_a_nome: 'Time A',
    time_b_nome: 'Time B',
    time_a_placar: '',
    time_b_placar: ''
  })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const { data } = await eventService.getAllEvents()
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const { upcomingEvents, historyEvents } = useMemo(() => {
    const now = new Date()
    const upcoming = []
    const history = []

    events.forEach((event) => {
      if (new Date(event.data_hora) >= now) {
        upcoming.push(event)
      } else {
        history.push(event)
      }
    })

    upcoming.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))
    history.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora))

    return { upcomingEvents: upcoming, historyEvents: history }
  }, [events])

  const getResultBadge = (event) => {
    if (
      event.tipo !== 'JOGO' ||
      event.time_a_placar === null ||
      event.time_b_placar === null ||
      event.time_a_placar === undefined ||
      event.time_b_placar === undefined
    ) {
      return null
    }

    if (event.time_a_placar > event.time_b_placar) {
      return { label: 'Vitoria do Time A', className: 'bg-emerald-100 text-emerald-700' }
    }

    if (event.time_b_placar > event.time_a_placar) {
      return { label: 'Vitoria do Time B', className: 'bg-red-100 text-red-700' }
    }

    return { label: 'Empate', className: 'bg-gray-100 text-gray-700' }
  }

  const openCreateForm = () => {
    setEditingEventId(null)
    setFormState({
      tipo: 'JOGO',
      data_hora: '',
      data_limite_confirmacao: '',
      local: ''
    })
    setShowEventForm(true)
  }

  const openEditForm = (event) => {
    setEditingEventId(event.id)
    setFormState({
      tipo: event.tipo || 'JOGO',
      data_hora: toDatetimeLocal(event.data_hora),
      data_limite_confirmacao: toDatetimeLocal(event.data_limite_confirmacao),
      local: event.local || ''
    })
    setShowEventForm(true)
  }

  const openScoreForm = (event) => {
    setScoreEventId(event.id)
    setScoreFormState({
      time_a_nome: event.time_a_nome || 'Time A',
      time_b_nome: event.time_b_nome || 'Time B',
      time_a_placar: event.time_a_placar ?? '',
      time_b_placar: event.time_b_placar ?? ''
    })
    setShowScoreForm(true)
  }

  const handleSaveEvent = async (e) => {
    e.preventDefault()
    if (!member?.id) return

    setSaving(true)
    try {
      if (editingEventId) {
        const { error } = await eventService.updateEvent(editingEventId, {
          tipo: formState.tipo,
          data_hora: formState.data_hora,
          data_limite_confirmacao: formState.data_limite_confirmacao || null,
          local: formState.local
        })

        if (error) throw error
        alert('Evento atualizado!')
      } else {
        const { error } = await eventService.createEvent({
          tipo: formState.tipo,
          data_hora: formState.data_hora,
          data_limite_confirmacao: formState.data_limite_confirmacao || null,
          local: formState.local,
          criado_por: member.id
        })

        if (error) throw error
        alert('Evento criado!')
      }

      setShowEventForm(false)
      setEditingEventId(null)
      await loadEvents()
    } catch (error) {
      console.error('Error saving event:', error)
      alert(`Erro ao salvar evento: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveScore = async (e) => {
    e.preventDefault()
    if (!scoreEventId) return

    const placarA = Number(scoreFormState.time_a_placar)
    const placarB = Number(scoreFormState.time_b_placar)

    if (!scoreFormState.time_a_nome.trim() || !scoreFormState.time_b_nome.trim()) {
      alert('Informe o nome dos dois times.')
      return
    }

    if (!Number.isInteger(placarA) || placarA < 0 || !Number.isInteger(placarB) || placarB < 0) {
      alert('Placar invalido. Use numeros inteiros maiores ou iguais a zero.')
      return
    }

    setScoreSaving(true)
    try {
      const { error } = await eventService.updateEventScore(scoreEventId, {
        time_a_nome: scoreFormState.time_a_nome.trim(),
        time_b_nome: scoreFormState.time_b_nome.trim(),
        time_a_placar: placarA,
        time_b_placar: placarB
      })

      if (error) throw error

      alert('Placar salvo!')
      setShowScoreForm(false)
      setScoreEventId(null)
      await loadEvents()
    } catch (error) {
      console.error('Error saving score:', error)
      alert(`Erro ao salvar placar: ${error?.message || 'erro desconhecido'}`)
    } finally {
      setScoreSaving(false)
    }
  }

  const handleGenerateTeams = async (eventId) => {
    if (!confirm('Sortear os times agora? Isso encerrara as confirmacoes.')) return

    try {
      const { data, error } = await teamsService.generateTeams(eventId, member.id)

      if (error) {
        alert(`Erro: ${error}`)
        return
      }

      alert(`Times gerados!\n\nTime Preto: ${data.preto.length}\nTime Branco: ${data.branco.length}`)
      loadEvents()
    } catch (error) {
      alert('Erro ao gerar times')
    }
  }

  const handleResetTeams = async (eventId) => {
    if (!confirm('Resetar times e reabrir confirmacoes?')) return

    try {
      const { error } = await teamsService.resetTeams(eventId)
      if (error) throw error
      alert('Times resetados! Confirmacoes reabertas.')
      loadEvents()
    } catch (error) {
      alert('Erro ao resetar times')
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return

    try {
      const { error } = await eventService.deleteEvent(eventId)
      if (error) throw error

      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null)
      }

      alert('Evento excluido!')
      await loadEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Erro ao excluir evento')
    }
  }

  const handleMarkAttendance = async (eventId, memberId, status) => {
    try {
      await eventService.markAttendance(eventId, memberId, status)
      alert('Presenca marcada!')

      const { data } = await adminService.getEventDetails(eventId)
      setSelectedEvent(data)
    } catch (error) {
      alert('Erro ao marcar presenca')
    }
  }

  if (loading) return <div>Carregando...</div>

  if (showEventForm) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">{editingEventId ? 'Editar Evento' : 'Criar Novo Evento'}</h2>
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              name="tipo"
              className="w-full px-4 py-2 border rounded-lg"
              required
              value={formState.tipo}
              onChange={(e) => setFormState((prev) => ({ ...prev, tipo: e.target.value }))}
            >
              <option value="JOGO">Jogo</option>
              <option value="INTERNO">Evento Interno</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Data e Hora</label>
            <input
              type="datetime-local"
              name="data_hora"
              className="w-full px-4 py-2 border rounded-lg"
              required
              value={formState.data_hora}
              onChange={(e) => setFormState((prev) => ({ ...prev, data_hora: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Limite de Confirmacoes (Opcional)</label>
            <input
              type="datetime-local"
              name="data_limite_confirmacao"
              className="w-full px-4 py-2 border rounded-lg"
              value={formState.data_limite_confirmacao}
              onChange={(e) => setFormState((prev) => ({ ...prev, data_limite_confirmacao: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Se deixar vazio, o sistema calcula automaticamente (sexta 18h ou 24h antes).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Local</label>
            <input
              type="text"
              name="local"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Ex: Arena CCC"
              required
              value={formState.local}
              onChange={(e) => setFormState((prev) => ({ ...prev, local: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {saving ? 'Salvando...' : editingEventId ? 'Salvar Alteracoes' : 'Criar Evento'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEventForm(false)
                setEditingEventId(null)
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (showScoreForm) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Lancar Placar</h2>
        <form onSubmit={handleSaveScore} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Time A</label>
              <input
                type="text"
                value={scoreFormState.time_a_nome}
                onChange={(e) => setScoreFormState((prev) => ({ ...prev, time_a_nome: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Placar Time A</label>
              <input
                type="number"
                min="0"
                step="1"
                value={scoreFormState.time_a_placar}
                onChange={(e) => setScoreFormState((prev) => ({ ...prev, time_a_placar: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Time B</label>
              <input
                type="text"
                value={scoreFormState.time_b_nome}
                onChange={(e) => setScoreFormState((prev) => ({ ...prev, time_b_nome: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Placar Time B</label>
              <input
                type="number"
                min="0"
                step="1"
                value={scoreFormState.time_b_placar}
                onChange={(e) => setScoreFormState((prev) => ({ ...prev, time_b_placar: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={scoreSaving}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {scoreSaving ? 'Salvando...' : 'Salvar Placar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowScoreForm(false)
                setScoreEventId(null)
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (selectedEvent) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <button onClick={() => setSelectedEvent(null)} className="mb-4 text-emerald-600 font-semibold">
          Voltar
        </button>

        <h2 className="text-xl font-bold mb-4">Marcar Presenca</h2>

        <div className="space-y-3">
          {selectedEvent.event_rsvp?.map((rsvp) => {
            const attendance = selectedEvent.event_attendance?.find((a) => a.member_id === rsvp.member_id)

            return (
              <div key={rsvp.member_id} className="border border-gray-200 rounded-lg p-4">
                <p className="font-semibold mb-3">{rsvp.members.nome}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'PRESENTE')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'PRESENTE' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Check size={16} className="mx-auto" />
                    Presente
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'ATRASO')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'ATRASO' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Clock size={16} className="mx-auto" />
                    Atraso
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'AUSENTE')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'AUSENTE' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <X size={16} className="mx-auto" />
                    Ausente
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'JUSTIFICADO')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'JUSTIFICADO' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Stethoscope size={16} className="mx-auto" />
                    Justificado
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderEventCard = (event, isHistory = false) => {
    const resultBadge = getResultBadge(event)

    return (
      <div key={event.id} className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-bold text-lg mb-1">{new Date(event.data_hora).toLocaleDateString()}</h3>
        <p className="text-gray-600 mb-1">
          {new Date(event.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-gray-600 mb-2">{event.local}</p>
        <p className="text-sm text-gray-500 mb-2">{event.event_rsvp?.filter((r) => r.status === 'VOU').length || 0} confirmados</p>

        {event.tipo === 'JOGO' && (
          <>
            {event.times_gerados ? (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700 font-semibold">Times ja sorteados</p>
              </div>
            ) : (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-semibold">
                  Confirmacoes ate:{' '}
                  {event.data_limite_confirmacao
                    ? new Date(event.data_limite_confirmacao).toLocaleString('pt-BR')
                    : 'sem limite'}
                </p>
              </div>
            )}
          </>
        )}

        {event.tipo === 'JOGO' && event.placar_finalizado && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700 mb-1">PLACAR</p>
            <p className="text-lg font-bold text-emerald-800">
              Time Preto {event.placar_preto || 0} x {event.placar_branco || 0} Time Branco
            </p>
          </div>
        )}

        {resultBadge && (
          <span className={`inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold ${resultBadge.className}`}>
            {resultBadge.label}
          </span>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedEvent(event)}
            className="bg-emerald-600 text-white py-2 rounded-lg font-semibold text-sm"
          >
            <Users size={16} className="inline mr-1" />
            Presenca
          </button>

          {event.tipo === 'JOGO' &&
            (event.times_gerados ? (
              <button
                onClick={() => handleResetTeams(event.id)}
                className="bg-orange-600 text-white py-2 rounded-lg font-semibold text-sm"
              >
                <RotateCcw size={16} className="inline mr-1" />
                Resetar
              </button>
            ) : (
              <button
                onClick={() => handleGenerateTeams(event.id)}
                className="bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm"
              >
                <Shuffle size={16} className="inline mr-1" />
                Sortear
              </button>
            ))}

          <button
            onClick={() => openEditForm(event)}
            className="bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm"
          >
            <Pencil size={16} className="inline mr-1" />
            Editar
          </button>

          <button
            onClick={() => handleDeleteEvent(event.id)}
            className="bg-red-600 text-white py-2 rounded-lg font-semibold text-sm"
          >
            <Trash2 size={16} className="inline mr-1" />
            Excluir
          </button>
        </div>

        {event.tipo === 'JOGO' && event.times_gerados && (
          <button
            onClick={() => setScoringEvent(event)}
            className="w-full mt-2 bg-purple-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <Trophy size={16} />
            {event.placar_finalizado ? 'Editar Placar' : 'Placar'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={openCreateForm}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <Plus size={24} />
        Criar Novo Evento
      </button>

      <section className="space-y-4">
        <h3 className="font-bold text-lg text-gray-800">Proximos eventos</h3>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum evento futuro.</p>
        ) : (
          upcomingEvents.map((event) => renderEventCard(event, false))
        )}
      </section>

      <section className="space-y-4">
        <h3 className="font-bold text-lg text-gray-800">Historico de eventos</h3>
        {historyEvents.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum evento passado.</p>
        ) : (
          historyEvents.map((event) => renderEventCard(event, true))
        )}
      </section>

      {scoringEvent && <AdminScore event={scoringEvent} onClose={() => setScoringEvent(null)} onSuccess={loadEvents} />}
    </div>
  )
}
