import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Reservation } from '@/types'

export function useCalendarReservations(year: number, month: number) {
  return useQuery({
    queryKey: ['reservations', 'calendar', year, month],
    queryFn: async (): Promise<Reservation[]> => {
      const start = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd')
      const end   = format(endOfMonth(new Date(year, month)),   'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('reservations')
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*), profile:profiles(*)')
        .gte('date', start)
        .lte('date', end)
        .not('status', 'eq', 'cancelada')
        .order('date')
        .order('time_slot_id')

      if (error) throw new Error(error.message)
      return data
    },
  })
}
