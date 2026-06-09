import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Restaurant, CreateRestaurantDTO } from '@/types'

// ----------------------------------------------------------------
// Discovery: todos los restaurantes activos (público, sin auth)
// ----------------------------------------------------------------
export interface RestaurantFilters {
  city?:         string
  zone?:         string
  cuisine_type?: string
  search?:       string
}

export function useRestaurants(filters: RestaurantFilters = {}) {
  return useQuery({
    queryKey: ['restaurants', filters],
    queryFn: async (): Promise<Restaurant[]> => {
      let query = supabase
        .from('restaurants')
        .select('*')
        .eq('active', true)
        .order('avg_rating', { ascending: false })

      if (filters.city)         query = query.ilike('city', `%${filters.city}%`)
      if (filters.zone)         query = query.ilike('zone', `%${filters.zone}%`)
      if (filters.cuisine_type) query = query.ilike('cuisine_type', `%${filters.cuisine_type}%`)
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,cuisine_type.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ----------------------------------------------------------------
// Perfil público de un restaurante
// ----------------------------------------------------------------
export function useRestaurant(id: string | undefined) {
  return useQuery({
    queryKey: ['restaurants', id],
    queryFn: async (): Promise<Restaurant> => {
      if (!id) throw new Error('ID requerido')
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// ----------------------------------------------------------------
// Admin: datos del propio restaurante
// ----------------------------------------------------------------
export function useMyRestaurant(restaurantId: string | null) {
  return useQuery({
    queryKey: ['restaurants', 'mine', restaurantId],
    queryFn: async (): Promise<Restaurant> => {
      if (!restaurantId) throw new Error('Sin restaurante asignado')
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!restaurantId,
  })
}

// ----------------------------------------------------------------
// Admin: actualizar datos del restaurante
// ----------------------------------------------------------------
export function useUpdateRestaurant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Restaurant> & { id: string }) => {
      const { error } = await supabase
        .from('restaurants')
        .update(data)
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', 'mine', id] })
      queryClient.invalidateQueries({ queryKey: ['restaurants'] })
    },
  })
}

// ----------------------------------------------------------------
// Registro: crear nuevo restaurante + vincular al admin
// ----------------------------------------------------------------
export function useCreateRestaurant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateRestaurantDTO): Promise<Restaurant> => {
      const { data, error } = await supabase
        .from('restaurants')
        .insert(dto)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] })
    },
  })
}

// ----------------------------------------------------------------
// Admin: subir foto de portada del restaurante
// ----------------------------------------------------------------
export function useUploadRestaurantCover() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, restaurantId }: { file: File; restaurantId: string }): Promise<string> => {
      const ext      = file.name.split('.').pop() ?? 'jpg'
      const path     = `restaurants/${restaurantId}/cover.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(path)
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ cover_image_url: publicUrl })
        .eq('id', restaurantId)
      if (updateError) throw new Error(updateError.message)

      return publicUrl
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] })
    },
  })
}

// ----------------------------------------------------------------
// Utilidad: valores únicos para filtros de discovery
// ----------------------------------------------------------------
export function useRestaurantCities() {
  return useQuery({
    queryKey: ['restaurants', 'cities'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('city')
        .eq('active', true)
      if (error) throw new Error(error.message)
      return [...new Set((data ?? []).map(r => r.city).filter(Boolean))].sort()
    },
    staleTime: 10 * 60 * 1000,
  })
}

// ----------------------------------------------------------------
// Restaurantes más populares hoy (por nº de reservas)
// ----------------------------------------------------------------
export function usePopularRestaurantsToday() {
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: ['restaurants', 'popular-today', today],
    queryFn: async (): Promise<Array<Restaurant & { reservations_today: number }>> => {
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('restaurant_id')
        .eq('date', today)
        .in('status', ['pendiente', 'confirmada', 'completada'])

      if (resError) throw new Error(resError.message)
      if (!reservations?.length) return []

      const counts: Record<string, number> = {}
      for (const r of reservations) {
        if (r.restaurant_id) counts[r.restaurant_id] = (counts[r.restaurant_id] ?? 0) + 1
      }

      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id)

      if (!topIds.length) return []

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .in('id', topIds)
        .eq('active', true)

      if (error) throw new Error(error.message)
      return (data ?? [])
        .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
        .map(r => ({ ...r, reservations_today: counts[r.id] ?? 0 }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ----------------------------------------------------------------
// Super_admin: restaurantes pendientes de aprobación
// ----------------------------------------------------------------
export function usePendingRestaurants() {
  return useQuery({
    queryKey: ['restaurants', 'pending'],
    queryFn: async (): Promise<Restaurant[]> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('active', false)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// ----------------------------------------------------------------
// Super_admin: aprobar o rechazar un restaurante
// ----------------------------------------------------------------
export function useApproveRestaurant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ active: approve })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] })
    },
  })
}

// ----------------------------------------------------------------
// Nuevos en MesaFácil (los más recientemente agregados)
// ----------------------------------------------------------------
export function useNewRestaurants() {
  return useQuery({
    queryKey: ['restaurants', 'new'],
    queryFn: async (): Promise<Restaurant[]> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw new Error(error.message)
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useRestaurantCuisines() {
  return useQuery({
    queryKey: ['restaurants', 'cuisines'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('cuisine_type')
        .eq('active', true)
      if (error) throw new Error(error.message)
      return [...new Set((data ?? []).map(r => r.cuisine_type).filter(Boolean))].sort() as string[]
    },
    staleTime: 10 * 60 * 1000,
  })
}
