import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTables } from './useTables'
import type { TableWithAvailability } from '@/types'

export function useAvailability(
  date: string | null,
  timeSlotId: string | null,
  restaurantId?: string | null,
) {
  const tablesQuery = useTables(restaurantId)

  const occupiedQuery = useQuery({
    queryKey: ['availability', date, timeSlotId, restaurantId],
    queryFn: async (): Promise<string[]> => {
      let query = supabase
        .from('reservations')
        .select('table_id')
        .eq('date', date!)
        .eq('time_slot_id', timeSlotId!)
        .in('status', ['pendiente', 'confirmada'])

      if (restaurantId) query = query.eq('restaurant_id', restaurantId)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data.map(r => r.table_id as string)
    },
    enabled: !!date && !!timeSlotId,
  })

  const occupiedIds = new Set(occupiedQuery.data ?? [])
  const tables      = tablesQuery.data ?? []

  const tablesWithAvailability: TableWithAvailability[] = tables.map(table => ({
    ...table,
    availability: occupiedIds.has(table.id) ? 'ocupada' : 'disponible',
  }))

  return {
    tablesWithAvailability,
    isLoading: tablesQuery.isLoading || occupiedQuery.isLoading,
    isError:   tablesQuery.isError   || occupiedQuery.isError,
  }
}
