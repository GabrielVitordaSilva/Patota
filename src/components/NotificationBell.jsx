import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, CircleDollarSign, AlertTriangle, CheckCheck, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { notificationService } from '../services/notifications'
import { pushService } from '../services/push'
import { useLiveData } from '../hooks'

const ICONES = {
  EVENTO: CalendarDays,
  MENSALIDADE: CircleDollarSign,
  PAGAMENTO: CircleDollarSign,
  MULTA: AlertTriangle
}

// O Realtime avisa na hora; a busca periodica e so uma rede de seguranca
const INTERVALO_MS = 5 * 60 * 1000

export default function NotificationBell({ memberId }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [pushState, setPushState] = useState('off')
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState('')
  const raiz = useRef(null)
  const naoLidas = items.filter((n) => !n.lida).length

  const carregar = useCallback(async () => {
    if (!memberId) return
    const { data, error } = await notificationService.list()
    if (!error) setItems(data)
  }, [memberId])

  useLiveData(['notifications'], carregar, 200)

  useEffect(() => {
    pushService.status().then(setPushState)
  }, [open])

  const alternarPush = async () => {
    setPushBusy(true)
    setPushMsg('')
    try {
      if (pushState === 'on') {
        await pushService.disable()
      } else {
        const { error } = await pushService.enable()
        if (error) setPushMsg(error)
      }
    } catch (e) {
      setPushMsg('Não foi possível alterar agora.')
    } finally {
      setPushState(await pushService.status())
      setPushBusy(false)
    }
  }

  // Busca ao abrir o app e a cada 5 minutos como reserva
  useEffect(() => {
    carregar()
    const timer = setInterval(carregar, INTERVALO_MS)
    return () => clearInterval(timer)
  }, [carregar])

  useEffect(() => {
    if (!open) return undefined
    const fora = (ev) => { if (raiz.current && !raiz.current.contains(ev.target)) setOpen(false) }
    const teclas = (ev) => { if (ev.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', teclas)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', teclas)
    }
  }, [open])

  const abrir = async (n) => {
    setOpen(false)
    if (!n.lida) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))
      await notificationService.markRead(n.id)
    }
    if (n.link) navigate(n.link)
  }

  const marcarTodas = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, lida: true })))
    await notificationService.markAllRead()
  }

  const limpar = async () => {
    setItems([])
    await notificationService.clearAll()
  }

  return (
    <div className="notif" ref={raiz} data-tour="notificacoes">
      <button
        type="button"
        className="icon-btn notif-btn"
        onClick={() => { setOpen((v) => !v); if (!open) carregar() }}
        aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={open}
        title="Notificações"
      >
        <Bell size={16} />
        {naoLidas > 0 && <span className="notif-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>

      {open && (
        <div className="notif-painel" role="dialog" aria-label="Notificações">
          <div className="notif-topo">
            <strong>Notificações</strong>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && <button type="button" onClick={marcarTodas} className="notif-acao" title="Marcar todas como lidas"><CheckCheck size={14} /> Ler todas</button>}
              {items.length > 0 && <button type="button" onClick={limpar} className="notif-acao" title="Apagar todas"><Trash2 size={14} /></button>}
            </div>
          </div>
          {items.length === 0 ? (
            <p className="notif-vazio">Nenhuma notificação por enquanto.</p>
          ) : (
            <ul className="notif-lista">
              {items.map((n) => {
                const Icone = ICONES[n.tipo] || Bell
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => abrir(n)} className={`notif-item ${n.lida ? '' : 'nova'}`}>
                      <span className="notif-icone"><Icone size={15} /></span>
                      <span className="notif-texto">
                        <strong>{n.titulo}</strong>
                        {n.mensagem && <span>{n.mensagem}</span>}
                        <time dateTime={n.criado_em}>{formatDistanceToNow(new Date(n.criado_em), { locale: ptBR, addSuffix: true })}</time>
                      </span>
                      {!n.lida && <span className="notif-ponto" aria-hidden="true" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {pushState !== 'unsupported' && (
            <div className="notif-push">
              {pushState === 'ios-install' ? (
                <p>No iPhone, para receber avisos com o app fechado, adicione o app à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá.</p>
              ) : pushState === 'denied' ? (
                <p>As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador para receber avisos.</p>
              ) : (
                <>
                  <p>{pushState === 'on' ? 'Avisos no celular ativados neste aparelho.' : 'Receba os avisos no celular, mesmo com o app fechado.'}</p>
                  <button type="button" onClick={alternarPush} disabled={pushBusy} className={pushState === 'on' ? 'ui-btn-secondary !min-h-8 !px-3 text-xs' : 'ui-btn-primary !min-h-8 !px-3 text-xs'}>
                    {pushBusy ? 'Aguarde...' : pushState === 'on' ? 'Desativar' : 'Ativar avisos'}
                  </button>
                </>
              )}
              {pushMsg && <p role="alert" className="notif-push-erro">{pushMsg}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
