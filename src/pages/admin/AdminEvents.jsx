import { useEffect, useState } from 'react'
import { Plus, Check, X, Clock, Stethoscope, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { eventService } from '../../services/events'
import { adminService } from '../../services/admin'

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
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formState, setFormState] = useState({
    tipo: 'JOGO',
    data_hora: '',
    local: ''
  })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const { data } = await eventService.getUpcomingEvents()
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const openCreateForm = () => {
    setEditingEventId(null)
    setFormState({
      tipo: 'JOGO',
      data_hora: '',
      local: ''
    })
    setShowEventForm(true)
  }

  const openEditForm = (event) => {
    setEditingEventId(event.id)
    setFormState({
      tipo: event.tipo || 'JOGO',
      data_hora: toDatetimeLocal(event.data_hora),
      local: event.local || ''
    })
    setShowEventForm(true)
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
          local: formState.local
        })

        if (error) throw error
        alert('Evento atualizado!')
      } else {
        const { error } = await eventService.createEvent({
          tipo: formState.tipo,
          data_hora: formState.data_hora,
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
      alert('Erro ao salvar evento')
    } finally {
      setSaving(false)
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

  return (
    <div className="space-y-4">
      <button
        onClick={openCreateForm}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <Plus size={24} />
        Criar Novo Evento
      </button>

      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-lg mb-1">{new Date(event.data_hora).toLocaleDateString()}</h3>
          <p className="text-gray-600 mb-1">{new Date(event.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-gray-600 mb-4">{event.local}</p>
          <p className="text-sm text-gray-500 mb-4">
            {event.event_rsvp?.filter((r) => r.status === 'VOU').length || 0} confirmados
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedEvent(event)}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold"
            >
              Marcar Presenca
            </button>
            <button
              onClick={() => openEditForm(event)}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Pencil size={16} />
              Editar
            </button>
            <button
              onClick={() => handleDeleteEvent(event.id)}
              className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}