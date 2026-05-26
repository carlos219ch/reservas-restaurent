// supabase/functions/notify-reservation/index.ts
//
// Edge Function para enviar emails de notificación de reservas.
//
// Deploy:
//   supabase functions deploy notify-reservation
//
// Secrets necesarios (una sola vez):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//
// La función acepta un POST con el body NotifyPayload y envía
// el email correspondiente usando la API de Resend.
// Si RESEND_API_KEY no está configurado, responde ok:true/skipped:true
// para no bloquear la operación principal.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL     = 'Mesa Fácil <onboarding@resend.dev>'   // cambia al dominio verificado
const APP_NAME       = 'Mesa Fácil'

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
interface ReservationInfo {
  date:        string    // 'yyyy-MM-dd'
  time:        string    // '19:00'
  guests:      number
  tableNumber: number
  zone?:       string
  occasion?:   string
  notes?:      string
}

interface NotifyPayload {
  type:        'created' | 'confirmed' | 'cancelled' | 'modified'
  userEmail:   string
  userName:    string
  reservation: ReservationInfo
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function detailsTable(r: ReservationInfo): string {
  const rows = [
    ['📅 Fecha',      `<span style="text-transform:capitalize">${formatDate(r.date)}</span>`],
    ['⏰ Hora',       r.time],
    ['👥 Comensales', `${r.guests} ${r.guests === 1 ? 'persona' : 'personas'}`],
    ['🪑 Mesa',       `Mesa #${r.tableNumber}${r.zone ? ` · ${r.zone}` : ''}`],
    ...(r.occasion && r.occasion !== 'ninguna'
      ? [['🎉 Ocasión', `<span style="text-transform:capitalize">${r.occasion}</span>`]] as [string, string][]
      : []),
    ...(r.notes
      ? [['📝 Notas', `<em>${r.notes}</em>`]] as [string, string][]
      : []),
  ]
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:140px;vertical-align:top">${label}</td>
          <td style="padding:8px 0;font-weight:600">${value}</td>
        </tr>
      `).join('')}
    </table>`
}

function buildHtml(title: string, intro: string, accentColor: string, r: ReservationInfo): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px">
      <p style="font-size:24px;margin:0">🍽️</p>
      <h1 style="font-size:20px;font-weight:700;margin:4px 0 0;color:#111827">${APP_NAME}</h1>
    </div>

    <!-- Card -->
    <div style="background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="border-left:4px solid ${accentColor};padding-left:16px;margin-bottom:20px">
        <h2 style="margin:0 0 4px;font-size:18px;color:#111827">${title}</h2>
        <p style="margin:0;color:#6b7280;font-size:14px">${intro}</p>
      </div>
      ${detailsTable(r)}
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px">
      © ${new Date().getFullYear()} ${APP_NAME} — Si tienes dudas, contáctanos respondiendo este email.
    </p>
  </div>
</body>
</html>`
}

function getEmailContent(p: NotifyPayload): { subject: string; html: string } {
  const first    = p.userName.split(' ')[0]
  const dateFmt  = formatDate(p.reservation.date)

  switch (p.type) {
    case 'created':
      return {
        subject: `✅ Reserva registrada — ${dateFmt}`,
        html: buildHtml(
          `¡Hola, ${first}! Tu reserva fue registrada`,
          'Hemos recibido tu solicitud. Te avisaremos cuando sea confirmada.',
          '#22c55e', p.reservation,
        ),
      }
    case 'confirmed':
      return {
        subject: `🎉 Reserva confirmada — ${dateFmt}`,
        html: buildHtml(
          `¡Reserva confirmada, ${first}!`,
          '¡Todo listo! Tu reserva está confirmada. Te esperamos.',
          '#16a34a', p.reservation,
        ),
      }
    case 'cancelled':
      return {
        subject: `❌ Reserva cancelada — ${dateFmt}`,
        html: buildHtml(
          'Reserva cancelada',
          'Tu reserva ha sido cancelada. Puedes hacer una nueva cuando quieras.',
          '#ef4444', p.reservation,
        ),
      }
    case 'modified':
      return {
        subject: `✏️ Reserva modificada — ${dateFmt}`,
        html: buildHtml(
          `Reserva actualizada, ${first}`,
          'Tu reserva ha sido modificada con los nuevos datos que indicaste.',
          '#3b82f6', p.reservation,
        ),
      }
  }
}

// ----------------------------------------------------------------
// Handler principal
// ----------------------------------------------------------------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // Si no hay clave, devuelve ok silencioso (no bloquea la UI)
    if (!RESEND_API_KEY) {
      console.warn('[notify-reservation] RESEND_API_KEY no configurado — email omitido')
      return new Response(
        JSON.stringify({ ok: true, skipped: true }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const payload: NotifyPayload = await req.json()
    const { subject, html }      = getEmailContent(payload)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   payload.userEmail,
        subject,
        html,
      }),
    })

    const body = await resendRes.json()
    return new Response(
      JSON.stringify({ ok: resendRes.ok, ...body }),
      { status: resendRes.status, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[notify-reservation]', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
