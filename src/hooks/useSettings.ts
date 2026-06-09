import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { TimeSlot, Table, Zone, TableShape } from '@/types'

// ================================================================
// TIME SLOTS
// ================================================================
export function useAllTimeSlots() {
  const { restaurantId } = useAuth()
  return useQuery({
    queryKey: ['settings', 'time_slots', restaurantId],
    queryFn: async (): Promise<TimeSlot[]> => {
      let q = supabase.from('time_slots').select('*').order('slot_time')
      if (restaurantId) q = q.eq('restaurant_id', restaurantId)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!restaurantId,
  })
}

export function useToggleTimeSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('time_slots').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'time_slots'] })
      qc.invalidateQueries({ queryKey: ['time_slots'] })
    },
  })
}

export function useCreateTimeSlot() {
  const qc = useQueryClient()
  const { restaurantId } = useAuth()
  return useMutation({
    mutationFn: async (slotTime: string) => {
      const { error } = await supabase
        .from('time_slots')
        .insert({ slot_time: slotTime, active: true, restaurant_id: restaurantId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'time_slots'] })
      qc.invalidateQueries({ queryKey: ['time_slots'] })
    },
  })
}

export function useDeleteTimeSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_slots').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'time_slots'] })
      qc.invalidateQueries({ queryKey: ['time_slots'] })
    },
  })
}

// ================================================================
// TABLES
// ================================================================
export function useAllTables() {
  const { restaurantId } = useAuth()
  return useQuery({
    queryKey: ['settings', 'tables', restaurantId],
    queryFn: async (): Promise<Table[]> => {
      let q = supabase.from('tables').select('*, zone:zones(*)').order('number')
      if (restaurantId) q = q.eq('restaurant_id', restaurantId)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!restaurantId,
  })
}

export function useToggleTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('tables').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'tables'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

export interface CreateTableDTO {
  number:   number
  capacity: number
  shape:    TableShape
  zone_id?: string | null
}

export function useCreateTable() {
  const qc = useQueryClient()
  const { restaurantId } = useAuth()
  return useMutation({
    mutationFn: async (dto: CreateTableDTO) => {
      const { error } = await supabase.from('tables').insert({
        ...dto,
        zone_id:       dto.zone_id ?? null,
        pos_x:         0,
        pos_y:         0,
        active:        true,
        restaurant_id: restaurantId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'tables'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

export function useUpdateTablePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pos_x, pos_y }: { id: string; pos_x: number; pos_y: number }) => {
      const { error } = await supabase.from('tables').update({ pos_x, pos_y }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'tables'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

export function useDeleteTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tables').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'tables'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

// ================================================================
// ZONES
// ================================================================
export function useAllZones() {
  const { restaurantId } = useAuth()
  return useQuery({
    queryKey: ['settings', 'zones', restaurantId],
    queryFn: async (): Promise<Zone[]> => {
      let q = supabase.from('zones').select('*').order('name')
      if (restaurantId) q = q.eq('restaurant_id', restaurantId)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!restaurantId,
  })
}

export function useToggleZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('zones').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'zones'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

export function useCreateZone() {
  const qc = useQueryClient()
  const { restaurantId } = useAuth()
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { error } = await supabase.from('zones').insert({
        name,
        description:   description ?? null,
        active:        true,
        restaurant_id: restaurantId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'zones'] })
    },
  })
}

export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('zones').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'zones'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}
