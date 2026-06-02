import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TimeSlot } from '@/types'

export function useTimeSlots(restaurantId?: string | null) {
  return useQuery({
    queryKey: ['time_slots', restaurantId],
    queryFn: async (): Promise<TimeSlot[]> => {
      let query = supabase.from('time_slots').select('*').eq('active', true).order('slot_time')
      if (restaurantId) query = query.eq('restaurant_id', restaurantId)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 1000 * 60 * 30,
  })
}
