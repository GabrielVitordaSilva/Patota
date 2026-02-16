import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext({})
const AUTH_TIMEOUT_MS = 10000

const withTimeout = (promise, ms, timeoutMessage) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    })
  ])

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

    const { data: listener } = authService.onAuthStateChange(async (_event, session) => {
      setLoading(true)
      try {
        if (session?.user) {
          setUser(session.user)
          await loadMemberData(session.user)
        } else {
          setUser(null)
          setMember(null)
          setIsAdmin(false)
        }
      } finally {
        setLoading(false)
      }
    })

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await withTimeout(
        authService.getCurrentUser(),
        AUTH_TIMEOUT_MS,
        'Timeout while checking user session'
      )

      if (currentUser) {
        setUser(currentUser)
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
      return
    }

    const fallbackMember = {
      id: authUser.id,
      nome: authUser.user_metadata?.name || authUser.email || 'Usuario',
      email: authUser.email || '',
      ativo: true
    }

    try {
      const { data: memberData, error: memberError } = await withTimeout(
        authService.getMemberData(authUser.id),
        AUTH_TIMEOUT_MS,
        'Timeout while loading member data'
      )

      if (memberError) {
        console.error('Error loading member data:', memberError)
      }

      setMember(memberData || fallbackMember)

      const adminStatus = await withTimeout(
        authService.isAdmin(authUser.id),
        AUTH_TIMEOUT_MS,
        'Timeout while checking admin role'
      )
      setIsAdmin(adminStatus)
    } catch (error) {
      console.error('Error loading member data:', error)
      setMember(fallbackMember)
      setIsAdmin(false)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await authService.signIn(email, password)
    if (!error && data.user) {
      setUser(data.user)
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
    }
    return { error }
  }

  const value = {
    user,
    member,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
