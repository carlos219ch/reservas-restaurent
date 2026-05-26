// src/hooks/useMenuItems.ts
//
// CRUD completo para los ítems de la carta del restaurante.
// Los clientes solo leen ítems disponibles (RLS).
// Los admins tienen acceso total.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MenuItem, CreateMenuItemDTO, UpdateMenuItemDTO } from '@/types'

// ----------------------------------------------------------------
// Leer carta (todos los ítems ordenados por categoría y sort_order)
// ----------------------------------------------------------------
export function useMenuItems() {
  return useQuery({
    queryKey: ['menu_items'],
    queryFn: async (): Promise<MenuItem[]> => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('sort_order')
        .order('name')
      if (error) throw new Error(error.message)
      return data as MenuItem[]
    },
    staleTime: 1000 * 60 * 5, // 5 min — la carta no cambia muy seguido
  })
}

// ----------------------------------------------------------------
// Crear ítem
// ----------------------------------------------------------------
export function useCreateMenuItem() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CreateMenuItemDTO): Promise<MenuItem> => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(dto)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as MenuItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu_items'] })
    },
  })
}

// ----------------------------------------------------------------
// Actualizar ítem
// ----------------------------------------------------------------
export function useUpdateMenuItem() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMenuItemDTO): Promise<MenuItem> => {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as MenuItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu_items'] })
    },
  })
}

// ----------------------------------------------------------------
// Eliminar ítem
// ----------------------------------------------------------------
export function useDeleteMenuItem() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu_items'] })
    },
  })
}
