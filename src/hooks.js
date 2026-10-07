import { useEffect, useRef } from 'react'
import { supabase } from './services/supabaseClient'

// Atualiza a tela sozinha quando alguem (ex.: o admin) altera dados no banco.
// Assina as mudancas das tabelas pelo Realtime do Supabase e chama onChange
// (com um pequeno atraso para juntar varias mudancas seguidas). O banco so envia
// as linhas que o usuario logado tem permissao de ler.
// Tambem recarrega quando a aba volta a ficar visivel ou a internet volta, que e
// quando uma conexao em segundo plano pode ter perdido eventos.
export function useLiveData(tables, onChange, delay = 500) {
  const callback = useRef(onChange)
  callback.current = onChange
  const chave = tables.join(',')

  useEffect(() => {
    let timer = null
    const disparar = () => {
      clearTimeout(timer)
      timer = setTimeout(() => callback.current?.(), delay)
    }

    const canal = supabase.channel(`live:${chave}:${Math.random().toString(36).slice(2, 8)}`)
    chave.split(',').forEach((table) => {
      canal.on('postgres_changes', { event: '*', schema: 'public', table }, disparar)
    })
    canal.subscribe()

    const aoVoltar = () => { if (document.visibilityState === 'visible') disparar() }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('online', disparar)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('online', disparar)
      supabase.removeChannel(canal)
    }
  }, [chave, delay])
}
