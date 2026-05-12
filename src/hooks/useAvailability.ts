import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTables } from './useTables'
import type { TableWithAvailability } from '@/types'

export function useAvailability(date: string | null, timeSlotId: string | null) {
  const tablesQuery = useTables()

  const occupiedQuery = useQuery({
    queryKey: ['availability', date, timeSlotId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('date', date!)
        .eq('time_slot_id', timeSlotId!)
        .in('status', ['pendiente', 'confirmada'])
      if (error) throw new Error(error.message)
      return data.map(r => r.table_id as string)
    },
    enabled: !!date && !!timeSlotId,
  })

  const occupiedIds = new Set(occupiedQuery.data ?? [])
  const tables = tablesQuery.data ?? []

  const tablesWithAvailability: TableWithAvailability[] = tables.map(table => ({
    ...table,
    availability: occupiedIds.has(table.id) ? 'ocupada' : 'disponible',
  }))

  return {
    tablesWithAvailability,
    isLoading: tablesQuery.isLoading || occupiedQuery.isLoading,
    isError: tablesQuery.isError || occupiedQuery.isError,
  }
}
