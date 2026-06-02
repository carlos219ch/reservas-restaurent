import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { WaitlistEntry } from '@/types'

export function useWaitlist(date: string) {
  const { restaurantId } = useAuth()

  return useQuery({
    queryKey: ['waitlist', date, restaurantId],
    queryFn: async (): Promise<WaitlistEntry[]> => {
      let query = supabase
        .from('waitlist')
        .select('*, profile:profiles(*), time_slot:time_slots(*)')
        .eq('date', date)
        .order('created_at')

      if (restaurantId) query = query.eq('restaurant_id', restaurantId)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!restaurantId,
    refetchInterval: 1000 * 60,
  })
}

export function useNotifyWaitlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('waitlist').update({ notified: true }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRemoveWaitlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('waitlist').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
