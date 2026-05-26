// src/lib/exportCSV.ts
// Genera y descarga un archivo CSV con las reservas recibidas.
// BOM UTF-8 incluido para compatibilidad con Excel.

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Reservation } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  cancelada:  'Cancelada',
  completada: 'Completada',
  no_show:    'No show',
}

const OCCASION_LABELS: Record<string, string> = {
  ninguna:     '',
  cumpleanos:  'Cumpleaños',
  aniversario: 'Aniversario',
  negocios:    'Negocios',
  otro:        'Otro',
}

function escape(value: string | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function exportReservationsToCSV(
  reservations: Reservation[],
  filename = 'reservas.csv',
) {
  const HEADERS = [
    'Fecha',
    'Hora',
    'Cliente',
    'Teléfono',
    'Mesa',
    'Zona',
    'Personas',
    'Ocasión',
    'Estado',
    'Notas',
    'Notas admin',
    'Riesgo no-show',
    'Creada el',
  ]

  const rows = reservations.map(r => [
    r.date,
    r.time_slot?.slot_time?.slice(0, 5) ?? '',
    r.profile?.full_name ?? '',
    r.profile?.phone ?? '',
    `Mesa #${r.table?.number ?? ''}`,
    r.table?.zone?.name ?? '',
    String(r.guests),
    OCCASION_LABELS[r.occasion] ?? r.occasion,
    STATUS_LABELS[r.status] ?? r.status,
    r.notes ?? '',
    r.admin_notes ?? '',
    r.no_show_risk != null ? `${r.no_show_risk}%` : '',
    format(parseISO(r.created_at), "d/MM/yyyy HH:mm", { locale: es }),
  ])

  const csv = [HEADERS, ...rows]
    .map(row => row.map(escape).join(','))
    .join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
