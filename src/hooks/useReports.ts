// src/hooks/useReports.ts
//
// Queries para la página de Reportes del panel admin.
// Todas las queries aceptan un parámetro `days` (ventana de análisis).

import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfWeek, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function today() {
  return format(new Date(), 'yyyy-MM-dd')
}
function fromDate(days: number) {
  return format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
}

// ----------------------------------------------------------------
// 1. Reservas por día  (BarChart)
// ----------------------------------------------------------------
export interface DailyData {
  date:    string   // 'd MMM' — eje X
  total:   number
  noShows: number
}

export function useReservationsByDay(days = 30) {
  return useQuery({
    queryKey: ['reports', 'byDay', days],
    queryFn: async (): Promise<DailyData[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('date, status')
        .gte('date', fromDate(days))
        .lte('date', today())
        .neq('status', 'cancelada')
        .order('date')

      if (error) throw new Error(error.message)

      const map: Record<string, DailyData> = {}

      // Pre-populate all days so días sin reservas aparecen como 0
      for (let i = days - 1; i >= 0; i--) {
        const d   = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const key = format(parseISO(d), 'd MMM', { locale: es })
        map[key]  = { date: key, total: 0, noShows: 0 }
      }

      for (const r of data ?? []) {
        const key = format(parseISO(r.date), 'd MMM', { locale: es })
        if (!map[key]) map[key] = { date: key, total: 0, noShows: 0 }
        map[key].total++
        if (r.status === 'no_show') map[key].noShows++
      }

      return Object.values(map)
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ----------------------------------------------------------------
// 2. Reservas por estado  (PieChart)
// ----------------------------------------------------------------
export interface StatusData {
  name:  string
  value: number
  color: string
}

const STATUS_COLORS: Record<string, string> = {
  pendiente:  '#f59e0b',
  confirmada: '#22c55e',
  completada: '#3b82f6',
  cancelada:  '#9ca3af',
  no_show:    '#ef4444',
}
const STATUS_LABELS: Record<string, string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada:  'Cancelada',
  no_show:    'No show',
}

export function useReservationsByStatus(days = 30) {
  return useQuery({
    queryKey: ['reports', 'byStatus', days],
    queryFn: async (): Promise<StatusData[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('status')
        .gte('date', fromDate(days))
        .lte('date', today())

      if (error) throw new Error(error.message)

      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        counts[r.status] = (counts[r.status] ?? 0) + 1
      }

      return Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([status, value]) => ({
          name:  STATUS_LABELS[status] ?? status,
          value,
          color: STATUS_COLORS[status] ?? '#6b7280',
        }))
        .sort((a, b) => b.value - a.value)
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ----------------------------------------------------------------
// 3. Reservas por ocasión  (BarChart horizontal)
// ----------------------------------------------------------------
export interface OccasionData {
  occasion: string
  count:    number
}

const OCCASION_LABELS: Record<string, string> = {
  ninguna:     'Sin ocasión',
  cumpleanos:  'Cumpleaños',
  aniversario: 'Aniversario',
  negocios:    'Negocios',
  otro:        'Otro',
}

export function useReservationsByOccasion(days = 90) {
  return useQuery({
    queryKey: ['reports', 'byOccasion', days],
    queryFn: async (): Promise<OccasionData[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('occasion')
        .gte('date', fromDate(days))
        .lte('date', today())
        .neq('status', 'cancelada')

      if (error) throw new Error(error.message)

      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        const key = r.occasion ?? 'ninguna'
        counts[key] = (counts[key] ?? 0) + 1
      }

      return Object.entries(counts)
        .map(([key, count]) => ({
          occasion: OCCASION_LABELS[key] ?? key,
          count,
        }))
        .sort((a, b) => b.count - a.count)
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ----------------------------------------------------------------
// 4. Tasa de no-shows por semana  (LineChart)
// ----------------------------------------------------------------
export interface NoShowRateData {
  week:  string
  rate:  number   // 0–100 (%)
  total: number
}

export function useNoShowRate(weeks = 8) {
  return useQuery({
    queryKey: ['reports', 'noShowRate', weeks],
    queryFn: async (): Promise<NoShowRateData[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('date, status')
        .gte('date', fromDate(weeks * 7))
        .lte('date', today())
        .neq('status', 'cancelada')
        .neq('status', 'pendiente')

      if (error) throw new Error(error.message)

      const map: Record<string, { total: number; noShows: number }> = {}

      for (const r of data ?? []) {
        const weekStart = format(
          startOfWeek(parseISO(r.date), { weekStartsOn: 1 }),
          'd MMM',
          { locale: es },
        )
        if (!map[weekStart]) map[weekStart] = { total: 0, noShows: 0 }
        map[weekStart].total++
        if (r.status === 'no_show') map[weekStart].noShows++
      }

      return Object.entries(map).map(([week, { total, noShows }]) => ({
        week,
        rate:  total > 0 ? Math.round((noShows / total) * 100) : 0,
        total,
      }))
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ----------------------------------------------------------------
// 5. Top horarios  (BarChart)
// ----------------------------------------------------------------
export interface HourData {
  time:  string
  count: number
}

export function useTopHours(days = 30) {
  return useQuery({
    queryKey: ['reports', 'topHours', days],
    queryFn: async (): Promise<HourData[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('time_slot:time_slots(slot_time)')
        .gte('date', fromDate(days))
        .lte('date', today())
        .neq('status', 'cancelada')

      if (error) throw new Error(error.message)

      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        const slot = r.time_slot as unknown as { slot_time: string } | null
        const time = slot?.slot_time?.slice(0, 5) ?? 'Sin hora'
        counts[time] = (counts[time] ?? 0) + 1
      }

      return Object.entries(counts)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time))
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ----------------------------------------------------------------
// 6. KPIs de resumen
// ----------------------------------------------------------------
export interface ReportKPIs {
  totalReservations: number
  completedRate:     number   // %
  noShowRate:        number   // %
  avgGuestsPerTable: number
  cancellationRate:  number   // %
}

export function useReportKPIs(days = 30) {
  return useQuery({
    queryKey: ['reports', 'kpis', days],
    queryFn: async (): Promise<ReportKPIs> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('status, guests')
        .gte('date', fromDate(days))
        .lte('date', today())

      if (error) throw new Error(error.message)

      const all        = data ?? []
      const total      = all.length
      const completed  = all.filter(r => r.status === 'completada').length
      const noShows    = all.filter(r => r.status === 'no_show').length
      const cancelled  = all.filter(r => r.status === 'cancelada').length
      const active     = total - cancelled
      const totalGuests = all.filter(r => r.status !== 'cancelada')
                             .reduce((s, r) => s + (r.guests ?? 0), 0)

      return {
        totalReservations: total,
        completedRate:     active > 0 ? Math.round((completed / active) * 100)  : 0,
        noShowRate:        active > 0 ? Math.round((noShows  / active) * 100)  : 0,
        cancellationRate:  total  > 0 ? Math.round((cancelled / total) * 100)  : 0,
        avgGuestsPerTable: active > 0 ? Math.round((totalGuests / active) * 10) / 10 : 0,
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}
