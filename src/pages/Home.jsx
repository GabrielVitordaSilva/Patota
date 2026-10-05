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
    return <div className="ui-card p-10 text-center text-sm text-slate-500">Carregando sua patota...</div>
  }

  const confirmed = nextEvent?.event_rsvp?.filter((r) => r.status === 'VOU').length || 0
  const pendingTotal = pendencies?.total || 0

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="ui-card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Proximo jogo</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{nextEvent ? format(parseISO(nextEvent.data_hora), "EEE, dd MMM", { locale: ptBR }) : 'Sem agenda'}</p>
          <p className="mt-1 text-xs text-slate-500">{nextEvent ? `${format(parseISO(nextEvent.data_hora), 'HH:mm')} · ${nextEvent.local}` : 'Novo jogo em breve'}</p>
        </div>
        <div className="ui-card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Confirmados</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{confirmed} jogadores</p>
          <p className="mt-1 text-xs text-emerald-700">Lista atualizada</p>
        </div>
        <div className="ui-card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Seu financeiro</p>
          <p className={`mt-2 text-lg font-bold ${pendingTotal > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{pendingTotal > 0 ? `R$ ${pendingTotal.toFixed(2)}` : 'Em dia'}</p>
          <p className="mt-1 text-xs text-slate-500">{pendingTotal > 0 ? 'Valor pendente' : 'Nenhuma pendencia'}</p>
        </div>
        <div className="ui-card p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Seu status</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{userRsvp === 'VOU' ? 'Confirmado' : userRsvp === 'NAO_VOU' ? 'Ausente' : userRsvp === 'TALVEZ' ? 'Talvez' : 'A confirmar'}</p>
          <p className="mt-1 text-xs text-blue-600">Presenca no proximo jogo</p>
        </div>
      </section>

      {nextEvent ? (
        <section className="ui-card overflow-hidden">
          <div className="grid lg:grid-cols-[1.55fr_.8fr]">
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Proxima pelada</span>
                </div>
                {confirmationOpen ? <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">Confirmacoes abertas</span> : <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">Lista encerrada</span>}
              </div>

              <div className="py-5">
                <p className="text-sm font-medium text-slate-500 capitalize">{format(parseISO(nextEvent.data_hora), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-950">{format(parseISO(nextEvent.data_hora), 'HH:mm')}</h2>
                  <p className="pb-1 text-sm font-medium text-slate-700">{nextEvent.local}</p>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(confirmed, 4))].map((_, index) => <span key={index} className="w-8 h-8 rounded-full grid place-items-center border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-600">{index + 1}</span>)}
                  </div>
                  <span className="text-xs text-slate-500"><strong className="text-slate-800">{confirmed}</strong> pessoas confirmaram</span>
                </div>
              </div>

              {dataLimite && confirmationOpen && <p className="flex items-center gap-2 text-xs text-slate-500 mb-4"><Clock size={15} className="text-blue-600" /> Responda ate {format(parseISO(dataLimite), "dd/MM 'as' HH:mm")}</p>}

              <div className="grid grid-cols-3 gap-2">
                {[['VOU', 'Vou jogar'], ['NAO_VOU', 'Nao vou'], ['TALVEZ', 'Talvez']].map(([status, label]) => (
                  <button key={status} disabled={!confirmationOpen} onClick={() => handleConfirmPresence(status)} className={`ui-btn text-xs md:text-sm ${userRsvp === status ? (status === 'VOU' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white') : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{label}</button>
                ))}
              </div>
            </div>

            <aside className="bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Resumo da rodada</p>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Confirmados</span><strong>{confirmed}</strong></div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><span className="block h-full bg-blue-600" style={{ width: `${Math.min(100, confirmed / 16 * 100)}%` }} /></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Times</span><strong>{teams ? 'Sorteados' : 'Aguardando'}</strong></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Sua resposta</span><strong>{userRsvp || 'Pendente'}</strong></div>
              </div>
              <Link to="/events" className="mt-6 ui-btn-secondary w-full text-sm"><Calendar size={16} /> Ver agenda completa</Link>
            </aside>
          </div>
        </section>
      ) : (
        <section className="ui-card p-8 text-center"><Calendar className="mx-auto text-slate-400" /><h2 className="mt-3 font-semibold">Nenhum jogo agendado</h2><p className="mt-1 text-sm text-slate-500">A diretoria ainda nao publicou a proxima rodada.</p></section>
      )}

      {teams && (
        <section className="ui-card p-5">
          <div className="flex items-center justify-between mb-4"><div><p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Escalacao</p><h2 className="mt-1 font-bold text-slate-900">Times sorteados</h2></div><button onClick={shareOnWhatsApp} className="ui-btn-secondary text-sm"><Share2 size={16} /> Compartilhar</button></div>
          <div className="grid md:grid-cols-2 gap-3">
            {[['Time preto', teams.preto, 'bg-slate-900 text-white'], ['Time branco', teams.branco, 'bg-slate-50 text-slate-900 border border-slate-200']].map(([name, players, style]) => <div key={name} className={`rounded-xl p-4 ${style}`}><p className="text-xs font-bold uppercase tracking-wider mb-3">{name}</p><div className="grid grid-cols-2 gap-2">{players?.map((player, i) => <span key={player.member_id} className="text-xs opacity-90 truncate">{i + 1}. {player.nome}</span>)}</div></div>)}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-[1.4fr_.6fr] gap-4">
        <section className={`rounded-xl border p-5 ${pendingTotal > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-start justify-between gap-4"><div className="flex gap-3">{pendingTotal > 0 ? <AlertCircle className="text-amber-600" /> : <CheckCircle className="text-emerald-600" />}<div><h3 className="font-semibold text-slate-900">{pendingTotal > 0 ? 'Pendencias financeiras' : 'Financeiro em dia'}</h3><p className="mt-1 text-sm text-slate-600">{pendingTotal > 0 ? `Existe R$ ${pendingTotal.toFixed(2)} aguardando pagamento.` : 'Voce nao possui mensalidades ou multas pendentes.'}</p></div></div><Link to="/finance" className="text-xs font-semibold text-blue-700 whitespace-nowrap">Ver detalhes</Link></div>
          {pendingTotal > 0 && <button onClick={copyPix} className="mt-4 ui-btn-primary text-sm">Copiar chave PIX</button>}
        </section>
        <section className="ui-card p-5 flex items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Temporada</p><p className="mt-1 font-semibold text-slate-900">Veja seu desempenho</p></div><Link to="/ranking" className="ui-btn-secondary text-sm">Ranking</Link></section>
      </div>

      {showConfirmModal && nextEvent && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="w-11 h-11 bg-blue-50 rounded-xl grid place-items-center mb-4"><CheckCircle className="text-blue-600" size={22} /></div>
            <h3 className="text-lg font-bold text-slate-900">Confirmar presenca?</h3>
            <p className="mt-2 text-sm text-slate-600">Ao confirmar, sua vaga fica reservada. Faltas sem aviso podem gerar multa de R$ 10,00.</p>
            <div className="mt-6 flex gap-2"><button onClick={() => { setShowConfirmModal(false); setSelectedStatus(null) }} className="flex-1 ui-btn-secondary">Cancelar</button><button onClick={confirmPresenceAfterModal} className="flex-1 ui-btn-primary">Confirmar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
