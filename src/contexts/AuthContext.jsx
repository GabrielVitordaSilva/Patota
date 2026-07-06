import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext({})
const AUTH_TIMEOUT_MS = 10000
const AUTH_CACHE_KEY = 'patota_auth_cache_v1'
const REVALIDATE_MIN_INTERVAL_MS = 2 * 60 * 1000 // revalida em background no maximo a cada 2 min

const withTimeout = (promise, ms, timeoutMessage) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    })
  ])

const readAuthCache = () => {
  if (typeof window === 'undefined') return null

  try {
    const rawCache = window.localStorage.getItem(AUTH_CACHE_KEY)
    return rawCache ? JSON.parse(rawCache) : null
  } catch (error) {
    console.error('Error reading auth cache:', error)
    return null
  }
}

const writeAuthCache = (payload) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('Error writing auth cache:', error)
  }
}

const clearAuthCache = () => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(AUTH_CACHE_KEY)
  } catch (error) {
    console.error('Error clearing auth cache:', error)
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [member, setMember] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Guarda o id do ultimo usuario cujos dados (member/admin) ja foram carregados.
  // Evita recarregar tudo quando o Supabase redispara SIGNED_IN/TOKEN_REFRESHED
  // ao voltar do background (comportamento padrao no mobile/PWA).
  const loadedUserIdRef = useRef(null)
  const lastFetchAtRef = useRef(0)

  useEffect(() => {
    // ATENCAO: o callback do onAuthStateChange precisa ser SINCRONO.
    // O SDK do Supabase segura um lock interno enquanto processa os callbacks;
    // qualquer `await supabase.from(...)` aqui dentro espera esse mesmo lock
    // e trava (deadlock) ate estourar timeout. Era exatamente isso que
    // congelava o app ao voltar do background. Trabalho pesado vai para
    // um setTimeout(0), que roda depois do lock ser liberado.
    const { data: listener } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        loadedUserIdRef.current = null
        setUser(null)
        setMember(null)
        setIsAdmin(false)
        clearAuthCache()
        setLoading(false)
        return
      }

      const sessionUser = session?.user || null

      if (!sessionUser) {
        // INITIAL_SESSION sem sessao = usuario nao logado
        if (event === 'INITIAL_SESSION') {
          setLoading(false)
        }
        return
      }

      setUser(sessionUser)

      // Mesmo usuario de antes (token refresh, volta do background etc.):
      // nao derruba a tela com loading nem refaz queries. O app continua
      // exatamente como estava.
      if (loadedUserIdRef.current === sessionUser.id) {
        setLoading(false)
        return
      }

      loadedUserIdRef.current = sessionUser.id

      // Hidrata do cache imediatamente: se ja conhecemos esse usuario,
      // o app abre na hora com os ultimos dados conhecidos (inclusive isAdmin)
      // e a revalidacao acontece em segundo plano.
      const cached = hydrateFromCache(sessionUser.id)
      if (cached) {
        setLoading(false)
      }

      // Adia a busca para fora do callback (libera o lock de auth primeiro)
      setTimeout(() => {
        loadMemberData(sessionUser, cached).finally(() => setLoading(false))
      }, 0)
    })

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  // Failsafe: nunca deixa o app preso em "Carregando..." para sempre
  useEffect(() => {
    if (!loading) return

    const failsafe = setTimeout(() => {
      setLoading(false)
    }, AUTH_TIMEOUT_MS * 2)

    return () => clearTimeout(failsafe)
  }, [loading])

  // Ao voltar para o app (visibilitychange), revalida member/admin em
  // SEGUNDO PLANO: sem loading, sem piscar a tela, e nunca rebaixando
  // isAdmin por causa de falha de rede.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return

      const userId = loadedUserIdRef.current
      if (!userId) return

      const now = Date.now()
      if (now - lastFetchAtRef.current < REVALIDATE_MIN_INTERVAL_MS) return

      setTimeout(() => {
        if (loadedUserIdRef.current !== userId) return
        loadMemberData({ id: userId }, readAuthCache())
      }, 0)
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const hydrateFromCache = (userId) => {
    const cache = readAuthCache()
    if (!cache || cache.userId !== userId) return null

    if (cache.member) {
      setMember(cache.member)
    }

    if (typeof cache.isAdmin === 'boolean') {
      setIsAdmin(cache.isAdmin)
    }

    return cache
  }

  const persistAuthCache = (authUser, nextMember, nextIsAdmin) => {
    if (!authUser?.id) return

    writeAuthCache({
      userId: authUser.id,
      member: nextMember,
      isAdmin: nextIsAdmin,
      updatedAt: new Date().toISOString()
    })
  }

  const loadMemberData = async (authUser, cachedAuth = null) => {
    if (!authUser?.id) {
      setMember(null)
      setIsAdmin(false)
      clearAuthCache()
      return
    }

    const fallbackMember = {
      id: authUser.id,
      nome: authUser.user_metadata?.name || authUser.email || 'Usuario',
      email: authUser.email || '',
      ativo: true
    }

    try {
      const [{ data: memberData, error: memberError }, adminStatus] = await Promise.all([
        withTimeout(
          authService.getMemberData(authUser.id),
          AUTH_TIMEOUT_MS,
          'Timeout while loading member data'
        ),
        withTimeout(
          authService.isAdmin(authUser.id),
          AUTH_TIMEOUT_MS,
          'Timeout while checking admin role'
        )
      ])

      if (memberError) {
        console.error('Error loading member data:', memberError)
      }

      lastFetchAtRef.current = Date.now()

      const resolvedMember = memberData || cachedAuth?.member || fallbackMember

      setMember(resolvedMember)
      setIsAdmin(adminStatus)
      persistAuthCache(authUser, resolvedMember, adminStatus)
    } catch (error) {
      // Falha de rede/timeout: mantem o ultimo estado conhecido.
      // Importante: NUNCA rebaixar isAdmin aqui - so uma resposta bem-sucedida
      // do banco (ou SIGNED_OUT) pode mudar esse valor. Era isso que fazia
      // a opcao Admin "sumir" quando a revalidacao falhava ao voltar pro app.
      console.error('Error loading member data:', error)
      setMember((prev) => prev || cachedAuth?.member || fallbackMember)

      if (typeof cachedAuth?.isAdmin === 'boolean') {
        setIsAdmin(cachedAuth.isAdmin)
      }
    }
  }

  const signIn = async (email, password) => {
    // O evento SIGNED_IN disparado pelo signInWithPassword ja cuida de
    // setar o usuario e carregar member/admin atraves do listener acima.
    const { data, error } = await authService.signIn(email, password)
    return { data, error }
  }

  const signUp = async (email, password, name) => {
    const { data, error } = await authService.signUp(email, password, name)
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await authService.signOut()
    if (!error) {
      loadedUserIdRef.current = null
      setUser(null)
      setMember(null)
      setIsAdmin(false)
      clearAuthCache()
    }
    return { error }
  }

  const value = useMemo(
    () => ({
      user,
      member,
      isAdmin,
      loading,
      signIn,
      signUp,
      signOut
    }),
    [user, member, isAdmin, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
