// src/hooks/useReviews.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/store/toastStore'
import type { Review, CreateReviewDTO } from '@/types'

// ----------------------------------------------------------------
// Reseña de una reserva concreta (para saber si ya existe)
// ----------------------------------------------------------------
export function useReviewForReservation(reservationId: string) {
  return useQuery({
    queryKey: ['review', reservationId],
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reservation_id', reservationId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ----------------------------------------------------------------
// Todas las reseñas del usuario actual
// ----------------------------------------------------------------
export function useMyReviews() {
  return useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// ----------------------------------------------------------------
// Admin: todas las reseñas (con datos de perfil)
// ----------------------------------------------------------------
export function useAdminReviews() {
  return useQuery({
    queryKey: ['reviews', 'admin'],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profile:profiles(full_name, phone), reservation:reservations(date, table:tables(number))')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// ----------------------------------------------------------------
// Crear reseña
// ----------------------------------------------------------------
export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CreateReviewDTO): Promise<Review> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('reviews')
        .insert({ ...dto, user_id: user.id })
        .select()
        .single()
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
