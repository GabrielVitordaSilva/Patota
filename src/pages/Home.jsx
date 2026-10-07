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
    loadData()
  }, [member?.id])

  // Deriva "confirmacoes abertas" direto dos campos do proprio evento,
  // sem query extra. Mesma regra do teamsService.isConfirmationOpen.
  const deriveConfirmationOpen = (event) => {
    if (!event) return false
    if (event.times_gerados) return false
    if (!event.data_limite_confirmacao) return true
    return new Date() < new Date(event.data_limite_confirmacao)
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
      // Antes eram 6 requisicoes em SEQUENCIA (evento -> confirmacao aberta
      // -> meu RSVP -> times -> pendencias, + pix). Como o getNextEvent usa
      // select('*') e ja traz data_limite_confirmacao, times_gerados,
      // times_json e TODOS os RSVPs, tres dessas queries eram redundantes.
      // Agora sao 3 requisicoes em PARALELO e o resto e derivado localmente.
      const [{ data: event }, pendenciesData, pixResult] = await Promise.all([
        eventService.getNextEvent(),
        financeService.getUserPendencies(member.id),
        configService.getPixKey().catch(() => null)
      ])

      setNextEvent(event || null)
      setPendencies(pendenciesData)
      if (pixResult) setPixKey(pixResult)

      if (event) {
        setDataLimite(event.data_limite_confirmacao || null)
        setConfirmationOpen(deriveConfirmationOpen(event))

        const myRsvp = event.event_rsvp?.find((r) => r.member_id === member.id)
        setUserRsvp(myRsvp?.status || null)

        setTeams(event.times_gerados && event.times_json ? event.times_json : null)
      } else {
        setConfirmationOpen(false)
        setDataLimite(null)
        setTeams(null)
        setUserRsvp(null)
      }
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
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey)
    alert('Chave PIX copiada!')
  }

  if (loading) {
    return <div className="ui-card p-10 text-center text-sm text-slate-500">Carregando...</div>
  }

  const confirmed = nextEvent?.event_rsvp?.filter((r) => r.status === 'VOU').length || 0
  const pendingTotal = pendencies?.total || 0

  const statusLabel = userRsvp === 'VOU' ? 'Confirmado' : userRsvp === 'NAO_VOU' ? 'Ausente' : 'A confirmar'
  const eventDate = nextEvent ? parseISO(nextEvent.data_hora) : null

  return (
    <div className="space-y-5">
      {nextEvent ? (
        <section className="rounded-xl overflow-hidden border border-blue-200 bg-blue-100 text-slate-900">
          <div className="grid lg:grid-cols-[1.5fr_1fr]">
            <div className="p-5 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-blue-800">Proxima pelada</p>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${confirmationOpen ? 'bg-blue-700 text-white' : 'border border-slate-300 text-slate-600'}`}>{confirmationOpen ? 'Lista aberta' : 'Lista encerrada'}</span>
              </div>

              <div className="mt-5 flex items-end gap-5">
                <p className="font-display text-7xl md:text-8xl font-bold leading-[.85] tabular-nums">{format(eventDate, 'HH:mm')}</p>
                <div className="pb-1 min-w-0">
                  <p className="font-display text-2xl md:text-3xl font-semibold uppercase leading-none capitalize">{format(eventDate, "EEE, dd/MM", { locale: ptBR })}</p>
                  <p className="mt-1.5 text-sm text-slate-600 truncate">{nextEvent.local}</p>
                </div>
              </div>

              {dataLimite && confirmationOpen && <p className="mt-6 flex items-center gap-2 text-xs text-slate-600"><Clock size={14} /> Responda ate {format(parseISO(dataLimite), "dd/MM 'as' HH:mm")}</p>}

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[['VOU', 'Vou'], ['NAO_VOU', 'Nao vou']].map(([status, label]) => (
                  <button key={status} disabled={!confirmationOpen} onClick={() => handleConfirmPresence(status)} className={`ui-btn text-sm border ${userRsvp === status ? 'bg-blue-700 text-white border-blue-700' : 'bg-white border-blue-300 text-slate-800 hover:bg-blue-50'}`}>{label}</button>
                ))}
              </div>
            </div>

            <aside className="p-5 md:p-8 border-t lg:border-t-0 lg:border-l border-blue-200 bg-white/55">
              <dl className="grid grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-0 lg:divide-y divide-blue-200">
                <div className="lg:py-4 lg:pt-0"><dt className="text-[11px] uppercase tracking-wider text-blue-800">Confirmados</dt><dd className="mt-1 font-display text-4xl font-bold leading-none tabular-nums">{confirmed}<span className="text-lg text-blue-800"> / 16</span></dd></div>
                <div className="lg:py-4"><dt className="text-[11px] uppercase tracking-wider text-blue-800">Times</dt><dd className="mt-1 font-display text-2xl font-semibold uppercase leading-none">{teams ? 'Sorteados' : 'Aguardando'}</dd></div>
                <div className="lg:py-4 lg:pb-0"><dt className="text-[11px] uppercase tracking-wider text-blue-800">Sua resposta</dt><dd className="mt-1 font-display text-2xl font-semibold uppercase leading-none">{statusLabel}</dd></div>
              </dl>
              <Link to="/events" className="mt-6 hidden lg:flex items-center justify-center gap-2 min-h-10 rounded-lg border border-blue-300 bg-white text-sm font-semibold hover:bg-blue-50"><Calendar size={16} /> Agenda completa</Link>
            </aside>
          </div>
        </section>
      ) : (
        <section className="ui-card p-8 text-center"><Calendar className="mx-auto text-slate-400" /><h2 className="mt-3 text-xl font-bold uppercase">Nenhum jogo agendado</h2><p className="mt-1 text-sm text-slate-500">A diretoria ainda nao publicou a proxima rodada.</p></section>
      )}

      {teams && (
        <section className="ui-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4"><h2 className="ui-title">Times sorteados</h2><button onClick={shareOnWhatsApp} className="ui-btn-secondary text-sm"><Share2 size={16} /> Compartilhar</button></div>
          <div className="grid md:grid-cols-2 gap-3">
            {[['Time preto', teams.preto, 'bg-slate-900 text-white'], ['Time branco', teams.branco, 'bg-white text-slate-900 border border-slate-300']].map(([name, players, style]) => <div key={name} className={`rounded-lg p-4 ${style}`}><p className="font-display text-lg font-bold uppercase tracking-wide mb-3">{name}</p><div className="grid grid-cols-2 gap-x-3 gap-y-1.5">{players?.map((player, i) => <span key={player.member_id} className="text-sm truncate"><span className="opacity-50 tabular-nums">{String(i + 1).padStart(2, '0')}</span> {player.nome}</span>)}</div></div>)}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-[1.4fr_.6fr] gap-4">
        <section className={`rounded-xl border p-5 ${pendingTotal > 0 ? 'bg-amber-50 border-amber-300' : 'ui-card'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              {pendingTotal > 0 ? <AlertCircle className="text-amber-600 shrink-0" /> : <CheckCircle className="text-blue-600 shrink-0" />}
              <div>
                <h3 className="text-xl font-bold uppercase leading-tight text-slate-900">{pendingTotal > 0 ? `R$ ${pendingTotal.toFixed(2)} pendentes` : 'Financeiro em dia'}</h3>
                <p className="mt-1 text-sm text-slate-600">{pendingTotal > 0 ? 'Mensalidades ou multas aguardando pagamento.' : 'Voce nao possui mensalidades ou multas pendentes.'}</p>
              </div>
            </div>
            <Link to="/finance" className="text-sm font-semibold text-blue-700 underline underline-offset-4 whitespace-nowrap">Detalhes</Link>
          </div>
          {pendingTotal > 0 && <button onClick={copyPix} className="mt-4 ui-btn-primary text-sm">Copiar chave PIX</button>}
        </section>
        <section className="ui-card p-5 flex items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Temporada</p><p className="mt-1 text-xl font-bold uppercase leading-tight text-slate-900">Veja o ranking</p></div><Link to="/ranking" className="ui-btn-secondary text-sm">Abrir</Link></section>
      </div>

      {showConfirmModal && nextEvent && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-end sm:items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl border border-slate-300 max-w-sm w-full p-6 animate-scale-in">
            <h3 className="text-2xl font-bold uppercase text-slate-900">Confirmar presenca?</h3>
            <p className="mt-2 text-sm text-slate-600">Ao confirmar, sua vaga fica reservada. Faltas sem aviso podem gerar multa de R$ 10,00.</p>
            <div className="mt-6 flex gap-2"><button onClick={() => { setShowConfirmModal(false); setSelectedStatus(null) }} className="flex-1 ui-btn-secondary">Cancelar</button><button onClick={confirmPresenceAfterModal} className="flex-1 ui-btn-primary">Confirmar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
