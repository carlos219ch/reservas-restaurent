// src/hooks/useNotifications.ts
//
// Envío de notificaciones por email vía Supabase Edge Function.
// Todas las llamadas son fire-and-forget: si el email falla
// la operación principal (crear/cancelar reserva) NO se interrumpe.
//
// Para activar los emails en producción:
//   1. supabase functions deploy notify-reservation
//   2. supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

import { supabase } from '@/lib/supabase'
import type { Reservation } from '@/types'

export type EmailType = 'created' | 'confirmed' | 'cancelled' | 'modified'

interface NotifyParams {
  type:        EmailType
  reservation: Reservation
  userEmail:   string
  userName:    string
}

/**
 * Envía un email de notificación de reserva.
 * No lanza errores — cualquier fallo queda en consola.
 */
export async function sendReservationEmail(params: NotifyParams): Promise<void> {
  try {
    const { reservation: r } = params

    const { error } = await supabase.functions.invoke('notify-reservation', {
      body: {
        type:        params.type,
        userEmail:   params.userEmail,
        userName:    params.userName,
        reservation: {
          date:        r.date,
          time:        r.time_slot?.slot_time?.slice(0, 5) ?? '—',
          guests:      r.guests,
          tableNumber: r.table?.number ?? 0,
          zone:        r.table?.zone?.name,
          occasion:    r.occasion,
          notes:       r.notes ?? undefined,
        },
      },
    })

    if (error) console.warn('[sendReservationEmail]', error.message)
  } catch (err) {
    console.warn('[sendReservationEmail] fallo silencioso:', err)
  }
}
