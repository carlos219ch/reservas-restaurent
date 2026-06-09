import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/toastStore'
import type { Review, CreateReviewDTO } from '@/types'

// ----------------------------------------------------------------
// Reseñas públicas recientes (para discovery page)
// ----------------------------------------------------------------
export interface PublicReview {
  id:            string
  rating:        number
  comment:       string | null
  created_at:    string
  restaurant_id: string | null
  user_id:       string | null
  profile:       { full_name: string } | null
}

export function useRecentPublicReviews() {
  return useQuery({
    queryKey: ['reviews', 'public-recent'],
    queryFn: async (): Promise<PublicReview[]> => {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, restaurant_id, user_id')
        .gte('rating', 4)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw new Error(error.message)
      if (!reviews?.length) return []

      const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const byId = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

      return reviews.map(r => ({
        ...r,
        profile: r.user_id && byId[r.user_id] ? { full_name: byId[r.user_id].full_name } : null,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useReviewForReservation(reservationId: string) {
  return useQuery({
    queryKey: ['review', reservationId],
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await supabase
        .from('reviews').select('*').eq('reservation_id', reservationId).maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useMyReviews() {
  return useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews').select('*').order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// Admin: reseñas del propio restaurante
export function useAdminReviews() {
  const { restaurantId } = useAuth()

  return useQuery({
    queryKey: ['reviews', 'admin', restaurantId],
    queryFn: async (): Promise<Review[]> => {
      let query = supabase
        .from('reviews')
        .select('*, profile:profiles(full_name, phone), reservation:reservations(date, table:tables(number))')
        .order('created_at', { ascending: false })
        .limit(100)

      if (restaurantId) query = query.eq('restaurant_id', restaurantId)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: !!restaurantId,
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CreateReviewDTO): Promise<Review> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Obtener restaurant_id desde la reserva
      const { data: reservation } = await supabase
        .from('reservations').select('restaurant_id').eq('id', dto.reservation_id).single()

      const { data, error } = await supabase
        .from('reviews')
        .insert({ ...dto, user_id: user.id, restaurant_id: reservation?.restaurant_id ?? null })
        .select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({ queryKey: ['review', dto.reservation_id] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      toast.success('¡Gracias por tu reseña! 🌟')
    },
    onError: () => toast.error('Error al enviar la reseña'),
  })
}
