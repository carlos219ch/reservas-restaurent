// supabase/functions/parse-menu/index.ts
//
// Recibe texto crudo extraído de un PDF de carta y usa Groq para
// convertirlo en un array de ítems de menú estructurado.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json() as { text: string }

    if (!text?.trim()) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')!

    const system = `Eres un extractor de menús de restaurantes. Analiza el texto de una carta y extrae TODOS los ítems.
Devuelve ÚNICAMENTE un array JSON válido, sin markdown, sin texto adicional, sin explicaciones.
Formato exacto:
[
  { "category": "string", "name": "string", "description": "string o null", "price": número }
]

Reglas estrictas:
- category: sección del plato. Si no está explicita, inferirla del contexto. Usa nombres como "Entrantes", "Sopas", "Principales", "Pastas", "Carnes", "Mariscos", "Postres", "Bebidas", "Vinos", etc.
- name: nombre exacto del plato como figura en el texto
- description: descripción breve disponible, null si no hay. Máximo 120 caracteres.
- price: número puro (sin $, sin ARS, sin €). Usar el primer precio si hay varios. Usar 0 si no hay precio.
- NO omitir ítems, incluir TODO lo que sea un plato/bebida/producto con precio
- Ignorar descripciones del restaurante, horarios, teléfonos, redes sociales`

    // Limitar el texto para no exceder el contexto del modelo
    const truncatedText = text.slice(0, 10000)

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',  // Modelo más capaz para parsing estructurado
        max_tokens:  4096,
        temperature: 0.1,                         // Baja temperatura para salida determinista
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: `Extrae los ítems de esta carta:\n\n${truncatedText}` },
        ],
      }),
    })

    const data    = await res.json()
    const content = data.choices?.[0]?.message?.content ?? '[]'

    console.log('Groq parse-menu status:', res.status)
    console.log('Groq response preview:', content.slice(0, 300))

    // Extraer JSON del response (incluso si el modelo añadió texto extra)
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    let items = []
    if (jsonMatch) {
      try {
        items = JSON.parse(jsonMatch[0])
      } catch (parseErr) {
        console.log('JSON parse error:', String(parseErr))
        items = []
      }
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.log('parse-menu error:', String(err))
    return new Response(JSON.stringify({ error: String(err), items: [] }), {
      status:  500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
