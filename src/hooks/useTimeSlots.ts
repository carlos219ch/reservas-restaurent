import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TimeSlot } from '@/types'

export function useTimeSlots() {
  return useQuery({
    queryKey: ['time_slots'],
    queryFn: async (): Promise<TimeSlot[]> => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('active', true)
        .order('slot_time')
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 1000 * 60 * 30,
  })
}
