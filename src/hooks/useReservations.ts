import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Reservation, CreateReservationDTO, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Admin: all reservations with optional filters
// ----------------------------------------------------------------
export interface AdminReservationFilters {
  status:   ReservationStatus | 'todas'
  dateFrom: string
  dateTo:   string
}

export function useAdminReservations(filters: AdminReservationFilters) {
  return useQuery({
    queryKey: ['admin', 'reservations', filters],
    queryFn: async (): Promise<Reservation[]> => {
      const allStatuses: ReservationStatus[] = ['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show']
      const statuses = filters.status === 'todas' ? allStatuses : [filters.status]
      const from     = filters.dateFrom || '2000-01-01'
      const to       = filters.dateTo   || '2099-12-31'

      const { data, error } = await supabase
        .from('reservations')
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*), profile:profiles(*)')
        .in('status', statuses)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })
        .order('time_slot_id')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useUpdateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }): Promise<void> => {
      const extra: Record<string, string> = {}
      if (status === 'confirmada') extra.confirmed_at = new Date().toISOString()
      if (status === 'cancelada')  extra.cancelled_at = new Date().toISOString()

      const { error } = await supabase
        .from('reservations')
        .update({ status, ...extra })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

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

export function useCancelReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reservationId: string): Promise<void> => {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelada', cancelled_at: new Date().toISOString() })
        .eq('id', reservationId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
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
