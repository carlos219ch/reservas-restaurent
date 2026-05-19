import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BlockedDate } from '@/types'

export function useBlockedDates() {
  return useQuery({
    queryKey: ['blocked_dates'],
    queryFn: async (): Promise<BlockedDate[]> => {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .order('date')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useBlockDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason?: string }) => {
      const { error } = await supabase
        .from('blocked_dates')
        .insert({ date, reason: reason || null })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked_dates'] }),
  })
}

export function useUnblockDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked_dates'] }),
  })
}
