import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { DashboardMetrics, Reservation } from '@/types'

function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const date = today()

      const [reservationsRes, tablesRes, waitlistRes] = await Promise.all([
        supabase
          .from('reservations')
          .select('status, time_slot:time_slots(slot_time)')
          .eq('date', date),
        supabase
          .from('tables')
          .select('id')
          .eq('active', true),
        supabase
          .from('waitlist')
          .select('id', { count: 'exact', head: true })
          .eq('date', date)
          .eq('notified', false),
      ])

      if (reservationsRes.error) throw new Error(reservationsRes.error.message)
      if (tablesRes.error)       throw new Error(tablesRes.error.message)

      const reservations = reservationsRes.data
      const totalTables  = tablesRes.data.length

      const active       = reservations.filter(r => r.status !== 'cancelada')
      const totalToday   = active.length
      const confirmedToday = active.filter(r => r.status === 'confirmada').length
      const noShowsToday   = active.filter(r => r.status === 'no_show').length
      const occupancyRate  = totalTables > 0
        ? Math.round((confirmedToday / totalTables) * 100)
        : 0
      const waitlistCount = waitlistRes.count ?? 0

      // Hora pico: slot con más reservas no canceladas
      const slotCounts: Record<string, number> = {}
      for (const r of active) {
        const slot = r.time_slot as unknown as { slot_time: string } | null
        const time = slot?.slot_time?.slice(0, 5) ?? 'Sin hora'
        slotCounts[time] = (slotCounts[time] ?? 0) + 1
      }
      const peakHour = Object.entries(slotCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

      return { totalToday, confirmedToday, noShowsToday, occupancyRate, waitlistCount, peakHour }
    },
    refetchInterval: 1000 * 60 * 2,
  })
}

export function useTodayReservations() {
  return useQuery({
    queryKey: ['reservations', 'today'],
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*), profile:profiles(*)')
        .eq('date', today())
        .order('time_slot_id')
      if (error) throw new Error(error.message)
      return data
    },
    refetchInterval: 1000 * 60 * 2,
  })
}
