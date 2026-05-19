import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TimeSlot, Table, Zone } from '@/types'

// ----------------------------------------------------------------
// Time slots
// ----------------------------------------------------------------
export function useAllTimeSlots() {
  return useQuery({
    queryKey: ['settings', 'time_slots'],
    queryFn: async (): Promise<TimeSlot[]> => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .order('slot_time')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useToggleTimeSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('time_slots').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'time_slots'] })
      queryClient.invalidateQueries({ queryKey: ['time_slots'] })
    },
  })
}

// ----------------------------------------------------------------
// Tables
// ----------------------------------------------------------------
export function useAllTables() {
  return useQuery({
    queryKey: ['settings', 'tables'],
    queryFn: async (): Promise<Table[]> => {
      const { data, error } = await supabase
        .from('tables')
        .select('*, zone:zones(*)')
        .order('number')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useToggleTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('tables').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'tables'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

// ----------------------------------------------------------------
// Zones
// ----------------------------------------------------------------
export function useAllZones() {
  return useQuery({
    queryKey: ['settings', 'zones'],
    queryFn: async (): Promise<Zone[]> => {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useToggleZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('zones').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'zones'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}
