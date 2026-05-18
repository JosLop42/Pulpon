import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getMyProfile } from '@/lib/supabase'

const AuthContext = createContext(null)

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000 // 8 horas
const SESSION_START_KEY  = 'pulpos-session-start'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        localStorage.setItem(SESSION_START_KEY, Date.now().toString())
      }

      if (event === 'INITIAL_SESSION' && session) {
        const start = parseInt(localStorage.getItem(SESSION_START_KEY) || '0', 10)
        if (!start || Date.now() - start > SESSION_TIMEOUT_MS) {
          supabase.auth.signOut()
          return
        }
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(SESSION_START_KEY)
      }

      setUser(session?.user ?? null)
      if (session?.user) {
        getMyProfile()
          .then(p => setProfile(p))
          .catch(() => setProfile(null))
          .finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Verifica el timeout cada minuto mientras la app está abierta
    const interval = setInterval(() => {
      const start = parseInt(localStorage.getItem(SESSION_START_KEY) || '0', 10)
      if (start && Date.now() - start > SESSION_TIMEOUT_MS) {
        supabase.auth.signOut()
      }
    }, 60_000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  async function refreshProfile() {
    try {
      const p = await getMyProfile()
      setProfile(p)
    } catch {
      // sin-op: perfil no crítico en refresh
    }
  }

  const value = {
    user,
    profile,
    loading,
    isAdmin:    profile?.role === 'admin',
    isEmployee: profile?.role === 'employee' || profile?.role === 'admin',
    isKitchen:  profile?.role === 'kitchen'  || profile?.role === 'admin',
    branchId:   profile?.branch_id ?? null,
    branchName: profile?.branches?.name ?? 'Sin sucursal',
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
