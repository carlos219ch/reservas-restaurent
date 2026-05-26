// src/hooks/useRealtimeReservations.ts
// Suscripción a Supabase Realtime: notifica al admin cuando entra
// una nueva reserva sin necesidad de refrescar la página.

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/store/toastStore'
import type { Reservation } from '@/types'

export function useRealtimeReservations() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('admin-reservations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations' },
        async (payload) => {
          // Obtener detalles completos para el toast
          const { data } = await supabase
            .from('reservations')
            .select('*, table:tables(number, zone:zones(name)), time_slot:time_slots(slot_time), profile:profiles(full_name)')
            .eq('id', (payload.new as Reservation).id)
            .single()

          if (data) {
            const name   = data.profile?.full_name ?? 'Cliente'
            const mesa   = data.table ? `Mesa #${data.table.number}` : ''
            const hora   = data.time_slot?.slot_time?.slice(0, 5) ?? ''
            toast.info(
              '🍽️ Nueva reserva',
              `${name} · ${mesa} · ${hora}`,
            )
          }

          // Invalidar queries para actualizar dashboard y lista
          queryClient.invalidateQueries({ queryKey: ['reservations'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['availability'] })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reservations'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])
}
