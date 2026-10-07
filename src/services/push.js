import { supabase } from './supabaseClient'

// Notificacoes push (Web Push): o aparelho se inscreve, a inscricao fica no banco
// e a Edge Function "send-push" envia quando uma notificacao e criada.

const base64ParaBytes = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const bruto = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0))
}

const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

export const pushService = {
  // 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'
  async status() {
    if (ehIOS() && !instalado()) return 'ios-install'
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'denied') return 'denied'

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      return sub && Notification.permission === 'granted' ? 'on' : 'off'
    } catch {
      return 'off'
    }
  },

  async enable() {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') return { error: 'Permissão negada' }

    const { data, error } = await supabase.functions.invoke('send-push', { body: { action: 'public_key' } })
    if (error || !data?.publicKey) return { error: 'Não foi possível ativar agora. Tente de novo.' }

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ParaBytes(data.publicKey)
    })

    const { endpoint, keys } = sub.toJSON()
    const { error: saveError } = await supabase.rpc('register_push_subscription', {
      p_endpoint: endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
      p_user_agent: navigator.userAgent.slice(0, 200)
    })
    if (saveError) {
      await sub.unsubscribe().catch(() => {})
      return { error: 'Não foi possível salvar a inscrição.' }
    }

    return { error: null }
  },

  async disable() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await supabase.rpc('unregister_push_subscription', { p_endpoint: sub.endpoint })
    await sub.unsubscribe().catch(() => {})
  },

  // Ao sair da conta o aparelho deixa de receber avisos dela (best-effort)
  async removeFromThisDevice() {
    try {
      if (!('serviceWorker' in navigator)) return
      await this.disable()
    } catch {
      /* sem push neste aparelho */
    }
  }
}
