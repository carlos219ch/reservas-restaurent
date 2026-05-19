const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message { role: 'user' | 'assistant'; content: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, slots } = await req.json() as { messages: Message[]; slots: string[] }
    const apiKey   = Deno.env.get('GROQ_API_KEY')!
    const slotList = (slots ?? []).join(', ')

    const system = `Eres el asistente de reservas de "Mesa Fácil", un restaurante.
Ayuda al cliente a hacer una reserva de forma amable, breve y en español.

Horarios disponibles: ${slotList || 'preguntar en local'}.

Cuando el cliente haya dado fecha, hora y número de personas, añade AL FINAL de tu respuesta (sin mencionarlo):
<intent>{"date":"YYYY-MM-DD","time":"HH:MM","guests":N,"occasion":"ninguna","notes":"","confirmed":false}</intent>

Reglas del bloque:
- date en formato YYYY-MM-DD.
- time debe coincidir exactamente con uno de los horarios disponibles.
- occasion: ninguna | cumpleanos | aniversario | negocios | otro
- Pon confirmed:true SOLO cuando el cliente confirme explícitamente la reserva.
- Si falta info, pídela de forma natural. No menciones el JSON.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'llama3-8b-8192',
        max_tokens:  600,
        temperature: 0.7,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })

    const data    = await res.json()
    const content = data.choices?.[0]?.message?.content
      ?? 'Lo siento, ocurrió un error. ¿Podés intentarlo de nuevo?'

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status:  500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
