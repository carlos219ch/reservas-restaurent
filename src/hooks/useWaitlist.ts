import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WaitlistEntry } from '@/types'

export function useWaitlist(date: string) {
  return useQuery({
    queryKey: ['waitlist', date],
    queryFn: async (): Promise<WaitlistEntry[]> => {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*, profile:profiles(*), time_slot:time_slots(*)')
        .eq('date', date)
        .order('created_at')
      if (error) throw new Error(error.message)
      return data
    },
    refetchInterval: 1000 * 60,
  })
}

export function useNotifyWaitlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('waitlist')
        .update({ notified: true })
        .eq('id', id)
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
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
