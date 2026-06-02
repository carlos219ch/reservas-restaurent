import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Reservation } from '@/types'

export interface ClientSummary {
  profile:           Profile
  totalReservations: number
  completedCount:    number
  noShowCount:       number
  lastVisit:         string | null
  noShowRate:        number
}

export function useClients() {
  const { restaurantId } = useAuth()

  return useQuery({
    queryKey: ['clients', 'list', restaurantId],
    queryFn: async (): Promise<ClientSummary[]> => {
      let resQuery = supabase
        .from('reservations')
        .select('user_id, status, date')
        .neq('status', 'pendiente')

      if (restaurantId) resQuery = resQuery.eq('restaurant_id', restaurantId)

      const [profilesRes, reservationsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cliente').order('full_name'),
        resQuery,
      ])

      if (profilesRes.error)     throw new Error(profilesRes.error.message)
      if (reservationsRes.error) throw new Error(reservationsRes.error.message)

      const profiles     = profilesRes.data
      const reservations = reservationsRes.data

      return profiles.map(profile => {
        const own       = reservations.filter(r => r.user_id === profile.id)
        const completed = own.filter(r => r.status === 'completada').length
        const noShows   = own.filter(r => r.status === 'no_show').length
        const active    = own.filter(r => r.status !== 'cancelada').length
        const lastVisit = own
          .filter(r => r.status === 'completada')
          .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null

        return {
          profile,
          totalReservations: own.length,
          completedCount:    completed,
          noShowCount:       noShows,
          lastVisit,
          noShowRate: active > 0 ? Math.round((noShows / active) * 100) : 0,
        }
      })
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useClientReservations(userId: string) {
  const { restaurantId } = useAuth()

  return useQuery({
    queryKey: ['clients', 'reservations', userId, restaurantId],
    queryFn: async (): Promise<Reservation[]> => {
      let query = supabase
        .from('reservations')
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (restaurantId) query = query.eq('restaurant_id', restaurantId)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!userId && !!restaurantId,
  })
}
