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
  const diasAte = eventDate ? Math.ceil((eventDate - new Date()) / 86400000) : null
  const quando = diasAte === null ? null : diasAte <= 0 ? ['Hoje', 'badge-warn'] : diasAte === 1 ? ['Amanha', 'badge-warn'] : [`Em ${diasAte} dias`, 'badge-info']

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Resumo" data-tour="kpis">
        <div className="ui-card p-3.5">
          <div className="flex items-center justify-between gap-2"><span className="rotulo">Proximo jogo</span>{quando && <span className={`badge ${quando[1]}`}>{quando[0]}</span>}</div>
          <p className="mt-2 text-lg font-bold tracking-tight text-slate-900 capitalize">{eventDate ? format(eventDate, "EEE, dd MMM", { locale: ptBR }) : 'Sem agenda'}</p>
          <p className="text-[11px] text-slate-500">{eventDate ? `${format(eventDate, 'HH:mm')} · ${nextEvent.local}` : 'Novo jogo em breve'}</p>
        </div>
        <div className="ui-card p-3.5">
          <div className="flex items-center justify-between gap-2"><span className="rotulo">Confirmados</span></div>
          <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">{confirmed} {confirmed === 1 ? 'jogador' : 'jogadores'}</p>
          <div className="mt-2"><progress className="ui-progress" max="16" value={Math.min(16, confirmed)} aria-label="Confirmados de 16 vagas" /></div>
        </div>
        <div className="ui-card p-3.5">
          <div className="flex items-center justify-between gap-2"><span className="rotulo">Seu financeiro</span><span className={`badge ${pendingTotal > 0 ? 'badge-warn' : 'badge-ok'}`}>{pendingTotal > 0 ? 'Pendente' : 'Em dia'}</span></div>
          <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">{pendingTotal > 0 ? `R$ ${pendingTotal.toFixed(2)}` : 'Tudo certo'}</p>
          <p className="text-[11px] text-slate-500">{pendingTotal > 0 ? 'Valor aguardando pagamento' : 'Nenhuma pendencia'}</p>
        </div>
        <div className="ui-card p-3.5">
          <div className="flex items-center justify-between gap-2"><span className="rotulo">Seu status</span></div>
          <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">{statusLabel}</p>
          <p className="text-[11px] text-slate-500">Presenca no proximo jogo</p>
        </div>
      </section>

      {nextEvent ? (
        <section className="ui-card overflow-hidden" data-tour="jogo">
          <div className="grid lg:grid-cols-[2fr_1fr]">
            <div className="p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
                <h2 className="ui-title">Proxima pelada</h2>
                <span className={`badge ${confirmationOpen ? 'badge-ok' : ''}`}>{confirmationOpen ? 'Lista aberta' : 'Lista encerrada'}</span>
              </div>
              <p className="text-sm font-medium text-slate-500 first-letter:uppercase">{format(eventDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
                <p className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 tabular-nums">{format(eventDate, 'HH:mm')}</p>
                <p className="pb-1.5 text-sm font-medium text-slate-600">{nextEvent.local}</p>
              </div>
              {dataLimite && confirmationOpen && <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Clock size={14} className="text-blue-600" /> Responda ate {format(parseISO(dataLimite), "dd/MM 'as' HH:mm")}</p>}
              <div className="mt-5 grid grid-cols-2 gap-2" data-tour="confirmar">
                {[['VOU', 'Vou'], ['NAO_VOU', 'Nao vou']].map(([status, label]) => (
                  <button key={status} disabled={!confirmationOpen} onClick={() => handleConfirmPresence(status)} className={userRsvp === status ? 'ui-btn-primary' : 'ui-btn-secondary'}>{label}</button>
                ))}
              </div>
            </div>
            <aside className="p-4 md:p-5 border-t lg:border-t-0 lg:border-l border-slate-200" style={{ background: 'var(--card-2)' }}>
              <p className="rotulo">Resumo da rodada</p>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Confirmados</dt><dd className="font-semibold text-slate-900">{confirmed} / 16</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Times</dt><dd className="font-semibold text-slate-900">{teams ? 'Sorteados' : 'Aguardando'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Sua resposta</dt><dd className="font-semibold text-slate-900">{statusLabel}</dd></div>
              </dl>
              <Link to="/events" className="mt-5 ui-btn-secondary w-full text-xs"><Calendar size={14} /> Agenda completa</Link>
            </aside>
          </div>
        </section>
      ) : (
        <section className="ui-card p-8 text-center" data-tour="jogo"><Calendar className="mx-auto text-slate-400" /><h2 className="mt-3 font-bold text-slate-900">Nenhum jogo agendado</h2><p className="mt-1 text-sm text-slate-500">A diretoria ainda nao publicou a proxima rodada.</p></section>
      )}

      {teams && (
        <section className="ui-card p-4 md:p-5" data-tour="times">
          <div className="flex items-center justify-between gap-3 mb-3"><h2 className="ui-title">Times sorteados</h2><button onClick={shareOnWhatsApp} className="ui-btn-secondary text-xs"><Share2 size={14} /> Compartilhar</button></div>
          <div className="grid md:grid-cols-2 gap-3">
            {[['Time preto', teams.preto, 'bg-slate-900 text-white'], ['Time branco', teams.branco, 'bg-white text-slate-900 border border-slate-300']].map(([name, players, style]) => <div key={name} className={`rounded-lg p-4 ${style}`}><p className="text-xs font-bold uppercase tracking-wider mb-3">{name}</p><div className="grid grid-cols-2 gap-x-3 gap-y-1.5">{players?.map((player, i) => <span key={player.member_id} className="text-sm truncate"><span className="opacity-50 tabular-nums">{String(i + 1).padStart(2, '0')}</span> {player.nome}</span>)}</div></div>)}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-[2fr_1fr] gap-4">
        <section className={`rounded-xl border p-4 md:p-5 ${pendingTotal > 0 ? 'bg-amber-50 border-amber-300' : 'ui-card'}`} data-tour="financeiro">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              {pendingTotal > 0 ? <AlertCircle className="text-amber-600 shrink-0" /> : <CheckCircle className="text-emerald-600 shrink-0" />}
              <div>
                <h3 className="text-sm font-bold text-slate-900">{pendingTotal > 0 ? `R$ ${pendingTotal.toFixed(2)} pendentes` : 'Financeiro em dia'}</h3>
                <p className="mt-0.5 text-xs text-slate-600">{pendingTotal > 0 ? 'Mensalidades ou multas aguardando pagamento.' : 'Voce nao possui mensalidades ou multas pendentes.'}</p>
              </div>
            </div>
            <Link to="/finance" className="text-xs font-semibold text-blue-700 whitespace-nowrap">Detalhes</Link>
          </div>
          {pendingTotal > 0 && <button onClick={copyPix} className="mt-4 ui-btn-primary text-xs">Copiar chave PIX</button>}
        </section>
        <section className="ui-card p-4 md:p-5 flex items-center justify-between gap-3"><div><p className="rotulo">Temporada</p><p className="mt-1 text-sm font-bold text-slate-900">Veja o ranking</p></div><Link to="/ranking" className="ui-btn-secondary text-xs">Abrir</Link></section>
      </div>

      {showConfirmModal && nextEvent && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-end sm:items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl border border-slate-300 max-w-sm w-full p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900">Confirmar presenca?</h3>
            <p className="mt-2 text-sm text-slate-600">Ao confirmar, sua vaga fica reservada. Faltas sem aviso podem gerar multa de R$ 10,00.</p>
            <div className="mt-6 flex gap-2"><button onClick={() => { setShowConfirmModal(false); setSelectedStatus(null) }} className="flex-1 ui-btn-secondary">Cancelar</button><button onClick={confirmPresenceAfterModal} className="flex-1 ui-btn-primary">Confirmar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
