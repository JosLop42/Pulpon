import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getMyProfile } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Un solo listener maneja tanto la sesión inicial como los cambios posteriores.
    // Supabase v2 emite INITIAL_SESSION al suscribirse, lo que cubre el estado de carga inicial.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

    return () => subscription.unsubscribe()
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
