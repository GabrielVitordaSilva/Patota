import { useCallback, useState } from 'react'

const temaAtual = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'

// O tema inicial e definido por um script no index.html (antes da pintura).
export function useTheme() {
  const [tema, setTema] = useState(temaAtual)
  const alternar = useCallback(() => {
    const novo = temaAtual() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', novo)
    try { localStorage.setItem('tema', novo) } catch { /* sem armazenamento: so vale nesta visita */ }
    setTema(novo)
  }, [])
  return { tema, alternar }
}
