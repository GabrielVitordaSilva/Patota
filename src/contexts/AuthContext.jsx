import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext({})

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
    // Verificar sessão inicial
    checkUser()

    // Listener de mudanças de auth
    const { data: listener } = authService.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await loadMemberData(session.user.id)
      } else {
        setUser(null)
        setMember(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        await loadMemberData(currentUser.id)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMemberData = async (userId) => {
  try {
    const memberData = await authService.getMemberData(userId)
    console.log('👤 Member data:', memberData) // ← ADICIONE
    setMember(memberData)
    
    const adminStatus = await authService.isAdmin(userId)
    console.log('👑 Admin status:', adminStatus) // ← ADICIONE
    setIsAdmin(adminStatus)
  } catch (error) {
    console.error('Error loading member data:', error)
  }
}

  const signIn = async (email, password) => {
    const { data, error } = await authService.signIn(email, password)
    if (!error && data.user) {
      setUser(data.user)
      await loadMemberData(data.user.id)
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
