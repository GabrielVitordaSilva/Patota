import { useEffect, useState } from 'react'
import { Plus, Check, X, Clock, Stethoscope } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { eventService } from '../../services/events'
import { adminService } from '../../services/admin'

export default function AdminEvents() {
  const { member } = useAuth()
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const { data } = await eventService.getUpcomingEvents()
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      await eventService.createEvent({
        tipo: formData.get('tipo'),
        data_hora: formData.get('data_hora'),
        local: formData.get('local'),
        criado_por: member.id
      })
      
      alert('Evento criado!')
      setShowCreateForm(false)
      loadEvents()
    } catch (error) {
      alert('Erro ao criar evento')
    }
  }

  const handleMarkAttendance = async (eventId, memberId, status) => {
    try {
      await eventService.markAttendance(eventId, memberId, status)
      alert('Presença marcada!')
      
      // Recarregar detalhes do evento
      const { data } = await adminService.getEventDetails(eventId)
      setSelectedEvent(data)
    } catch (error) {
      alert('Erro ao marcar presença')
    }
  }

  if (loading) return <div>Carregando...</div>

  if (showCreateForm) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Criar Novo Evento</h2>
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select name="tipo" className="w-full px-4 py-2 border rounded-lg" required>
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
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold"
            >
              Criar Evento
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
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
        <button
          onClick={() => setSelectedEvent(null)}
          className="mb-4 text-emerald-600 font-semibold"
        >
          ← Voltar
        </button>
        
        <h2 className="text-xl font-bold mb-4">Marcar Presença</h2>
        
        <div className="space-y-3">
          {selectedEvent.event_rsvp?.map((rsvp) => {
            const attendance = selectedEvent.event_attendance?.find(
              a => a.member_id === rsvp.member_id
            )
            
            return (
              <div key={rsvp.member_id} className="border border-gray-200 rounded-lg p-4">
                <p className="font-semibold mb-3">{rsvp.members.nome}</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'PRESENTE')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'PRESENTE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Check size={16} className="mx-auto" />
                    Presente
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'ATRASO')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'ATRASO'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Clock size={16} className="mx-auto" />
                    Atraso
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'AUSENTE')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'AUSENTE'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <X size={16} className="mx-auto" />
                    Ausente
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(selectedEvent.id, rsvp.member_id, 'JUSTIFICADO')}
                    className={`py-2 rounded-lg text-sm font-semibold ${
                      attendance?.status === 'JUSTIFICADO'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
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
        onClick={() => setShowCreateForm(true)}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <Plus size={24} />
        Criar Novo Evento
      </button>

      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-lg mb-2">{new Date(event.data_hora).toLocaleDateString()}</h3>
          <p className="text-gray-600 mb-4">{event.local}</p>
          <p className="text-sm text-gray-500 mb-4">
            {event.event_rsvp?.filter(r => r.status === 'VOU').length || 0} confirmados
          </p>
          <button
            onClick={() => setSelectedEvent(event)}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold"
          >
            Marcar Presença
          </button>
        </div>
      ))}
    </div>
  )
}
