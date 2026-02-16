import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users } from 'lucide-react'
import { eventService } from '../services/events'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Events() {
  const [events, setEvents] = useState([])
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

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Eventos</h1>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Calendar className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">Nenhum evento agendado no momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                    event.tipo === 'JOGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {event.tipo}
                  </span>
                  <h3 className="text-lg font-bold text-gray-800">
                    {format(parseISO(event.data_hora), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <p className="text-gray-600">{format(parseISO(event.data_hora), 'HH:mm')}h</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={18} />
                  <span>{event.local}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={18} />
                  <span>{event.event_rsvp?.filter(r => r.status === 'VOU').length || 0} confirmados</span>
                </div>
              </div>

              {event.event_rsvp && event.event_rsvp.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Confirmados:</p>
                  <div className="flex flex-wrap gap-2">
                    {event.event_rsvp
                      .filter(r => r.status === 'VOU')
                      .map((rsvp) => (
                        <span key={rsvp.member_id} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                          {rsvp.members.nome}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
