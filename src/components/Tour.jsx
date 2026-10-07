import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { getSteps } from './tourSteps'

const visivel = (el) => {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}

export default function Tour({ isAdmin }) {
  const { pathname } = useLocation()
  const [passos, setPassos] = useState(null)
  const [atual, setAtual] = useState(0)
  const [foco, setFoco] = useState({ top: '50%', left: '50%', width: 0, height: 0 })
  const [pos, setPos] = useState({ left: 12, top: 12 })
  const caixa = useRef(null)
  const alvo = useRef(null)
  const botaoRef = useRef(null)
  const aberto = passos !== null

  const fechar = useCallback(() => {
    setPassos(null)
    alvo.current = null
    botaoRef.current?.focus()
  }, [])

  const iniciar = useCallback((ev) => {
    botaoRef.current = ev?.currentTarget || null
    const lista = getSteps(pathname, isAdmin)
      .map(([sel, titulo, texto]) => ({ sel, titulo, texto }))
      .filter((p) => !p.sel || visivel(document.querySelector(p.sel)))
    if (!lista.length) return
    setAtual(0)
    setPassos(lista)
  }, [pathname, isAdmin])

  useEffect(() => {
    const botoes = document.querySelectorAll('[data-tour-iniciar]')
    botoes.forEach((b) => b.addEventListener('click', iniciar))
    return () => botoes.forEach((b) => b.removeEventListener('click', iniciar))
  }, [iniciar])

  // fecha ao trocar de tela
  useEffect(() => { setPassos(null) }, [pathname])

  const posicionar = useCallback(() => {
    const el = caixa.current
    if (!el) return
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const margem = 12
    const folga = 6
    const cw = el.offsetWidth
    const ch = el.offsetHeight
    if (!alvo.current) {
      setFoco({ top: '50%', left: '50%', width: 0, height: 0 })
      setPos({ left: Math.max(margem, (vw - cw) / 2), top: Math.max(margem, (vh - ch) / 2) })
      return
    }
    const r = alvo.current.getBoundingClientRect()
    const top = Math.max(r.top - folga, 4)
    const left = Math.max(r.left - folga, 4)
    const bottom = Math.min(r.bottom + folga, vh - 4)
    const right = Math.min(r.right + folga, vw - 4)
    setFoco({ top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) })
    let y
    let x
    if (bottom + 12 + ch <= vh - margem) y = bottom + 12
    else if (top - 12 - ch >= margem) y = top - 12 - ch
    else if (right + 12 + cw <= vw - margem) { y = Math.min(Math.max(top, margem), vh - ch - margem); x = right + 12 }
    else if (left - 12 - cw >= margem) { y = Math.min(Math.max(top, margem), vh - ch - margem); x = left - 12 - cw }
    else y = vh - ch - margem
    if (x === undefined) x = Math.min(Math.max(left, margem), vw - cw - margem)
    setPos({ left: x, top: y })
  }, [])

  // mostra o passo atual: rola até o alvo e posiciona
  useEffect(() => {
    if (!aberto) return undefined
    const p = passos[atual]
    alvo.current = p.sel ? document.querySelector(p.sel) : null
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (alvo.current) {
      const r = alvo.current.getBoundingClientRect()
      if (!(r.top >= 70 && r.bottom <= window.innerHeight - 20)) {
        alvo.current.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: reduzir ? 'auto' : 'smooth' })
      }
    }
    posicionar()
    const t = setTimeout(posicionar, reduzir ? 0 : 380)
    return () => clearTimeout(t)
  }, [aberto, atual, passos, posicionar])

  useEffect(() => {
    if (!aberto) return undefined
    let quadro = 0
    const agendar = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(posicionar) }
    const teclas = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); fechar() }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); setAtual((i) => (i >= passos.length - 1 ? i : i + 1)) }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); setAtual((i) => Math.max(0, i - 1)) }
    }
    window.addEventListener('resize', agendar)
    window.addEventListener('scroll', agendar, true)
    document.addEventListener('keydown', teclas, true)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', agendar)
      window.removeEventListener('scroll', agendar, true)
      document.removeEventListener('keydown', teclas, true)
    }
  }, [aberto, passos, posicionar, fechar])

  if (!aberto) return null
  const p = passos[atual]
  const ultimo = atual === passos.length - 1

  return (
    <>
      <div className="tour-fundo" onClick={fechar} />
      <div className="tour-foco" style={foco} />
      <div ref={caixa} className="tour-caixa" role="dialog" aria-modal="true" aria-labelledby="tour-titulo" aria-describedby="tour-texto" style={{ ...pos, maxWidth: 'min(360px, calc(100vw - 24px))' }}>
        <div className="tour-topo">
          <span className="tour-conta">{atual + 1} de {passos.length}</span>
          <button type="button" className="icon-btn" onClick={fechar} aria-label="Fechar guia" title="Fechar (Esc)"><X size={14} /></button>
        </div>
        <h2 id="tour-titulo">{p.titulo}</h2>
        <p id="tour-texto">{p.texto}</p>
        <div className="tour-pontos" aria-hidden="true">
          {passos.map((_, i) => <span key={i} className={i === atual ? 'on' : ''} />)}
        </div>
        <div className="tour-botoes">
          {atual > 0 && <button type="button" className="ui-btn-secondary !min-h-8 !px-3 !text-xs" onClick={() => setAtual(atual - 1)}>Voltar</button>}
          <button type="button" autoFocus className="ui-btn-primary !min-h-8 !px-3 !text-xs" onClick={() => (ultimo ? fechar() : setAtual(atual + 1))}>{ultimo ? 'Concluir' : 'Próximo'}</button>
        </div>
      </div>
    </>
  )
}
