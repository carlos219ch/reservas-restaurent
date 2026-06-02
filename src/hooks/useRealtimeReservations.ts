import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/store/toastStore'
import type { Reservation } from '@/types'

export function useRealtimeReservations() {
  const queryClient    = useQueryClient()
  const { restaurantId } = useAuth()

  useEffect(() => {
    const filter = restaurantId
      ? `restaurant_id=eq.${restaurantId}`
      : undefined

    const channel = supabase
      .channel('admin-reservations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations', filter },
        async (payload) => {
          const { data } = await supabase
            .from('reservations')
            .select('*, table:tables(number, zone:zones(name)), time_slot:time_slots(slot_time), profile:profiles(full_name)')
            .eq('id', (payload.new as Reservation).id)
            .single()

          if (data) {
            const name = data.profile?.full_name ?? 'Cliente'
            const mesa = data.table ? `Mesa #${data.table.number}` : ''
            const hora = data.time_slot?.slot_time?.slice(0, 5) ?? ''
            toast.info('🍽️ Nueva reserva', `${name} · ${mesa} · ${hora}`)
          }

          queryClient.invalidateQueries({ queryKey: ['reservations'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['availability'] })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservations', filter },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reservations'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient, restaurantId])
}
