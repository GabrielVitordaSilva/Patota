import { useEffect } from 'react'
import { X } from 'lucide-react'
import Rules from '../pages/Rules'

export default function RulesModal({ onClose }) {
  useEffect(() => {
    const teclas = (ev) => { if (ev.key === 'Escape') onClose() }
    document.addEventListener('keydown', teclas)
    return () => document.removeEventListener('keydown', teclas)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Regras" className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl p-4 sm:p-6 animate-scale-in" style={{ background: 'var(--bg)' }} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="icon-btn absolute right-3 top-3 z-10" aria-label="Fechar regras" title="Fechar (Esc)"><X size={16} /></button>
        <Rules />
      </div>
    </div>
  )
}
