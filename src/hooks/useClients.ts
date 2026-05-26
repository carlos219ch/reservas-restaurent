// src/hooks/useClients.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile, Reservation } from '@/types'

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
export interface ClientSummary {
  profile:        Profile
  totalReservations: number
  completedCount:    number
  noShowCount:       number
  lastVisit:         string | null
  noShowRate:        number   // %
}

// ----------------------------------------------------------------
// Lista de todos los clientes con stats
// ----------------------------------------------------------------
export function useClients() {
  return useQuery({
    queryKey: ['clients', 'list'],
    queryFn: async (): Promise<ClientSummary[]> => {
      const [profilesRes, reservationsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'cliente')
          .order('full_name'),
        supabase
          .from('reservations')
          .select('user_id, status, date')
          .neq('status', 'pendiente'),
      ])

      if (profilesRes.error) throw new Error(profilesRes.error.message)
      if (reservationsRes.error) throw new Error(reservationsRes.error.message)

      const profiles     = profilesRes.data
      const reservations = reservationsRes.data

      return profiles.map(profile => {
        const own       = reservations.filter(r => r.user_id === profile.id)
        const completed = own.filter(r => r.status === 'completada').length
        const noShows   = own.filter(r => r.status === 'no_show').length
        const active    = own.filter(r => !['cancelada'].includes(r.status)).length
        const lastVisit = own
          .filter(r => r.status === 'completada')
          .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null

        return {
          profile,
          totalReservations: own.length,
          completedCount:    completed,
          noShowCount:       noShows,
          lastVisit,
          noShowRate:        active > 0 ? Math.round((noShows / active) * 100) : 0,
        }
      })
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ----------------------------------------------------------------
// Historial completo de un cliente
// ----------------------------------------------------------------
export function useClientReservations(userId: string) {
  return useQuery({
    queryKey: ['clients', 'reservations', userId],
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!userId,
  })
}
