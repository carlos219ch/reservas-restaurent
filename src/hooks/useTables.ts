import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Table } from '@/types'

// restaurantId opcional: si se omite, trae todas las mesas activas (single-tenant legacy)
export function useTables(restaurantId?: string | null) {
  return useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async (): Promise<Table[]> => {
      let query = supabase.from('tables').select('*, zone:zones(*)').eq('active', true).order('number')
      if (restaurantId) query = query.eq('restaurant_id', restaurantId)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}
