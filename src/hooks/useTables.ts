import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Table } from '@/types'

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: async (): Promise<Table[]> => {
      const { data, error } = await supabase
        .from('tables')
        .select('*, zone:zones(*)')
        .eq('active', true)
        .order('number')
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}
