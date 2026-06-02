import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { BlockedDate } from '@/types'

export function useBlockedDates(restaurantId?: string | null) {
  const { restaurantId: authRestaurantId } = useAuth()
  const rid = restaurantId ?? authRestaurantId

  return useQuery({
    queryKey: ['blocked_dates', rid],
    queryFn: async (): Promise<BlockedDate[]> => {
      let query = supabase.from('blocked_dates').select('*').order('date')
      if (rid) query = query.eq('restaurant_id', rid)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useBlockDate() {
  const qc = useQueryClient()
  const { restaurantId } = useAuth()

  return useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason?: string }) => {
      const { error } = await supabase
        .from('blocked_dates')
        .insert({ date, reason: reason || null, restaurant_id: restaurantId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked_dates'] }),
  })
}

export function useUnblockDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_dates').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked_dates'] }),
  })
}
