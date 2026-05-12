import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Reservation, CreateReservationDTO } from '@/types'

export function useMyReservations() {
  return useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CreateReservationDTO): Promise<Reservation> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('reservations')
        .insert({ user_id: user.id, ...dto })
        .select('*, table:tables(*), time_slot:time_slots(*)')
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta mesa ya no está disponible para el horario seleccionado.')
        }
        throw new Error('Error al crear la reserva. Intenta de nuevo.')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}
