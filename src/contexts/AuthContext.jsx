import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext({})
const AUTH_TIMEOUT_MS = 10000
const AUTH_CACHE_KEY = 'patota_auth_cache_v1'

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

  useEffect(() => {
    checkUser()

    const { data: listener } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser((currentUser) => currentUser || session.user)
        }
        return
      }

      if (session?.user) {
        setUser(session.user)
        hydrateFromCache(session.user.id)
        setLoading(true)

        try {
          await loadMemberData(session.user)
        } finally {
          setLoading(false)
        }

        return
      }

      setUser(null)
      setMember(null)
      setIsAdmin(false)
      clearAuthCache()
      setLoading(false)
    })

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!loading) return

    const failsafe = setTimeout(() => {
      setLoading(false)
    }, AUTH_TIMEOUT_MS * 2)

    return () => clearTimeout(failsafe)
  }, [loading])

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

  const checkUser = async () => {
    try {
      const currentUser = await withTimeout(
        authService.getCurrentUser(),
        AUTH_TIMEOUT_MS,
        'Timeout while checking user session'
      )

      if (currentUser) {
        setUser(currentUser)
        hydrateFromCache(currentUser.id)
        await loadMemberData(currentUser)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMemberData = async (authUser) => {
    if (!authUser?.id) {
      setMember(null)
      setIsAdmin(false)
      clearAuthCache()
      return
    }

    const cachedAuth = hydrateFromCache(authUser.id)
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

      const resolvedMember = memberData || cachedAuth?.member || fallbackMember

      setMember(resolvedMember)
      setIsAdmin(adminStatus)
      persistAuthCache(authUser, resolvedMember, adminStatus)
    } catch (error) {
      console.error('Error loading member data:', error)
      const resolvedMember = cachedAuth?.member || fallbackMember
      const resolvedAdmin = typeof cachedAuth?.isAdmin === 'boolean' ? cachedAuth.isAdmin : false

      setMember(resolvedMember)
      setIsAdmin(resolvedAdmin)
      persistAuthCache(authUser, resolvedMember, resolvedAdmin)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await authService.signIn(email, password)
    if (!error && data.user) {
      setUser(data.user)
      hydrateFromCache(data.user.id)
      await loadMemberData(data.user)
    }
    return { data, error }
  }

  const signUp = async (email, password, name) => {
    const { data, error } = await authService.signUp(email, password, name)
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await authService.signOut()
    if (!error) {
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
