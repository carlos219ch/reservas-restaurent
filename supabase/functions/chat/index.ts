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
    const { messages, slots, menuContext } = await req.json() as {
      messages:    Message[]
      slots:       string[]
      menuContext?: string
    }

    const apiKey   = Deno.env.get('GROQ_API_KEY')!
    const slotList = (slots ?? []).join(', ')

    // Sección de carta (solo si se proporcionó)
    const menuSection = menuContext
      ? `\n\nCarta del restaurante (platos disponibles con precios):\n${menuContext}\n\nCuando el cliente pregunte qué hay en el menú, por el menú, las opciones o algo para comer/beber, respondé con los platos disponibles de la categoría relevante, siempre incluyendo el precio. Si no especifica categoría, sugerí 2-3 platos destacados. Si pregunta por recomendaciones, sugerí platos considerando lo que ya conversaron (ocasión, cantidad de personas, preferencias mencionadas).`
      : ''

    const system = `Eres el asistente de reservas y atención de "Mesa Fácil", un restaurante elegante.
Ayuda al cliente de forma amable, breve y en español rioplatense (vos/te).
Podés ayudar a hacer reservas Y también responder preguntas sobre la carta y hacer recomendaciones.${menuSection}

Horarios disponibles para reservar: ${slotList || 'consultar en local'}.

Cuando el cliente quiera hacer una reserva y haya dado fecha, hora y número de personas, añade AL FINAL de tu respuesta (sin mencionarlo):
<intent>{"date":"YYYY-MM-DD","time":"HH:MM","guests":N,"occasion":"ninguna","notes":"","confirmed":false}</intent>

Reglas del bloque intent:
- date en formato YYYY-MM-DD.
- time debe coincidir exactamente con uno de los horarios disponibles.
- occasion: ninguna | cumpleanos | aniversario | negocios | otro
- Pon confirmed:true SOLO cuando el cliente confirme explícitamente la reserva.
- Si falta info para la reserva, pedila de forma natural. No menciones el JSON.
- Si el cliente solo pregunta sobre el menú sin querer reservar, NO incluyas el bloque intent.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.1-8b-instant',
        max_tokens:  700,
        temperature: 0.7,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })

    const data    = await res.json()
    console.log('Groq status:', res.status)
    console.log('Groq response:', JSON.stringify(data))

    const content = data.choices?.[0]?.message?.content
      ?? 'Lo siento, ocurrió un error. ¿Podés intentarlo de nuevo?'

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.log('Catch error:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), {
      status:  500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
