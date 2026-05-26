import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sendReservationEmail } from '@/hooks/useNotifications'
import type { Reservation, CreateReservationDTO, ReservationStatus, SpecialOccasion } from '@/types'

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
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }): Promise<Reservation> => {
      const extra: Record<string, string> = {}
      if (status === 'confirmada') extra.confirmed_at = new Date().toISOString()
      if (status === 'cancelada')  extra.cancelled_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('reservations')
        .update({ status, ...extra })
        .eq('id', id)
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*), profile:profiles(*)')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: async (reservation, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })

      // Email al cliente cuando el admin confirma o cancela
      if ((status === 'confirmada' || status === 'cancelada') && reservation.profile) {
        const { data: { user } } = await supabase.auth.getUser()
        // Obtenemos el email del propietario de la reserva desde auth
        // (solo disponible si el admin tiene service_role; en su defecto se omite)
        const profileEmail = user?.email
        if (profileEmail && reservation.profile.id === user?.id) {
          sendReservationEmail({
            type:        status === 'confirmada' ? 'confirmed' : 'cancelled',
            reservation,
            userEmail:   profileEmail,
            userName:    reservation.profile.full_name,
          })
        }
      }
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
    mutationFn: async (reservationId: string): Promise<Reservation> => {
      const { data, error } = await supabase
        .from('reservations')
        .update({ status: 'cancelada', cancelled_at: new Date().toISOString() })
        .eq('id', reservationId)
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*)')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: async (reservation) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })

      // Notificar por email al propio cliente que canceló
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        sendReservationEmail({
          type:        'cancelled',
          reservation,
          userEmail:   user.email,
          userName:    profile?.full_name ?? 'Cliente',
        })
      }
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
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*)')
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta mesa ya no está disponible para el horario seleccionado.')
        }
        throw new Error('Error al crear la reserva. Intenta de nuevo.')
      }
      return data
    },
    onSuccess: async (reservation) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })

      // Notificar por email al cliente que creó la reserva
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        sendReservationEmail({
          type:        'created',
          reservation,
          userEmail:   user.email,
          userName:    profile?.full_name ?? 'Cliente',
        })
      }
    },
  })
}

// ----------------------------------------------------------------
// Editar reserva (cliente)
// ----------------------------------------------------------------
export interface EditReservationDTO {
  id:           string
  table_id:     string   // para validar disponibilidad
  date:         string
  time_slot_id: string
  guests:       number
  occasion:     SpecialOccasion
  notes?:       string
}

export function useEditReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: EditReservationDTO): Promise<Reservation> => {
      // Verificar que la mesa esté libre en el nuevo horario (excluye esta reserva)
      const { data: conflicts, error: conflictError } = await supabase
        .from('reservations')
        .select('id')
        .eq('table_id', dto.table_id)
        .eq('date', dto.date)
        .eq('time_slot_id', dto.time_slot_id)
        .in('status', ['pendiente', 'confirmada'])
        .neq('id', dto.id)

      if (conflictError) throw new Error(conflictError.message)
      if (conflicts && conflicts.length > 0) {
        throw new Error('La mesa no está disponible en ese horario. Por favor elige otro.')
      }

      const { data, error } = await supabase
        .from('reservations')
        .update({
          date:         dto.date,
          time_slot_id: dto.time_slot_id,
          guests:       dto.guests,
          occasion:     dto.occasion,
          notes:        dto.notes ?? null,
        })
        .eq('id', dto.id)
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*)')
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: async (reservation) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      // Notificar modificación por email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        sendReservationEmail({
          type:        'modified',
          reservation,
          userEmail:   user.email,
          userName:    profile?.full_name ?? 'Cliente',
        })
      }
    },
  })
}
