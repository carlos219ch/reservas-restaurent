// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
 
interface AuthState {
  profile: Profile | null
  loading: boolean
  error: string | null
}
 
interface UseAuthReturn extends AuthState {
  isAdmin: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
 
async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
 
  if (error) {
    console.error('Error al cargar perfil:', error.message)
    return null
  }
 
  return data
}
 
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    profile: null,
    loading: true,
    error: null,
  })
 
  const loadProfile = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
 
    const profile = await fetchProfileById(userId)
 
    setState({
      profile,
      loading: false,
      error: profile ? null : 'No se pudo cargar el perfil',
    })
  }, [])
 
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) await loadProfile(session.user.id)
  }, [loadProfile])
 
  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setState({ profile: null, loading: false, error: null })
      }
    })
 
    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          loadProfile(session.user.id)
        } else {
          setState({ profile: null, loading: false, error: null })
        }
      }
    )
 
    return () => subscription.unsubscribe()
  }, [loadProfile])
 
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])
 
  return {
    ...state,
    isAdmin: state.profile?.role === 'admin',
    isAuthenticated: !!state.profile,
    signOut,
    refreshProfile,
  }
}