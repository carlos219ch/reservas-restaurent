import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/toastStore'
import type { Review, CreateReviewDTO } from '@/types'

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
