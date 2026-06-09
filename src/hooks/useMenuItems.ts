import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { MenuItem, CreateMenuItemDTO, UpdateMenuItemDTO } from '@/types'

// ----------------------------------------------------------------
// Platos destacados multi-restaurante (para discovery page)
// ----------------------------------------------------------------
export interface MenuHighlight extends MenuItem {
  restaurant_id: string
  restaurant: { id: string; name: string; cover_image_url: string | null } | null
}

export function useWeeklyMenuHighlights() {
  return useQuery({
    queryKey: ['menu_items', 'weekly-highlights'],
    queryFn: async (): Promise<MenuHighlight[]> => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, restaurant:restaurants(id, name, cover_image_url)')
        .eq('available', true)
        .gt('price', 0)
        .not('description', 'is', null)
        .order('sort_order')
        .limit(12)
      if (error) throw new Error(error.message)
      return (data ?? []) as MenuHighlight[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

// ----------------------------------------------------------------
// Carta pública del restaurante (para el chat IA del cliente)
// ----------------------------------------------------------------
export function usePublicMenuItems(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: ['menu_items', 'public', restaurantId],
    queryFn: async (): Promise<MenuItem[]> => {
      if (!restaurantId) return []
      const { data, error } = await supabase
        .from('menu_items').select('*')
        .eq('restaurant_id', restaurantId).eq('available', true)
        .order('category').order('sort_order')
      if (error) throw new Error(error.message)
      return data as MenuItem[]
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  })
}

// ----------------------------------------------------------------
// Leer carta (admin — scoped al restaurante)
// ----------------------------------------------------------------
export function useMenuItems() {
  const { restaurantId } = useAuth()

  return useQuery({
    queryKey: ['menu_items', restaurantId],
    queryFn: async (): Promise<MenuItem[]> => {
      let query = supabase.from('menu_items').select('*').order('category').order('sort_order').order('name')
      if (restaurantId) query = query.eq('restaurant_id', restaurantId)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data as MenuItem[]
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  })
}

// ----------------------------------------------------------------
// Crear ítem
// ----------------------------------------------------------------
export function useCreateMenuItem() {
  const qc = useQueryClient()
  const { restaurantId } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreateMenuItemDTO): Promise<MenuItem> => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({ ...dto, restaurant_id: restaurantId })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as MenuItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
  })
}

// ----------------------------------------------------------------
// Eliminar ítem
// ----------------------------------------------------------------
export function useDeleteMenuItem() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
  })
}
