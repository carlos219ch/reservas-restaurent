import { useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useChatStore } from '@/store/chatStore'
import type { ChatMessage, MenuItem, ReservationIntent } from '@/types'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function parseIntent(text: string): ReservationIntent | null {
  const match = text.match(/<intent>([\s\S]*?)<\/intent>/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as ReservationIntent
  } catch {
    return null
  }
}

function stripIntent(text: string): string {
  return text.replace(/<intent>[\s\S]*?<\/intent>/, '').trim()
}

function makeId(): string {
  return Math.random().toString(36).slice(2)
}

// Convierte el array de ítems en texto para el sistema prompt
function buildMenuContext(items: MenuItem[]): string {
  const available = items.filter(i => i.available)
  if (!available.length) return ''

  // Agrupar por categoría
  const byCategory = available.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return Object.entries(byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, items]) => {
      const lines = items.map(item => {
        const price = `$${Number(item.price).toFixed(0)}`
        const desc  = item.description ? ` — ${item.description}` : ''
        return `  • ${item.name} (${price})${desc}`
      }).join('\n')
      return `${cat}:\n${lines}`
    })
    .join('\n\n')
}

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------
export function useChat(slots: string[], menuItems: MenuItem[] = []) {
  const { messages, intent, error, addMessage, setIntent, setError, reset } = useChatStore()
  const [isLoading, setIsLoading] = useState(false)

  // Formatear carta una sola vez mientras los ítems no cambian
  const menuContext = useMemo(() => buildMenuContext(menuItems), [menuItems])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    setError(null)

    const userMsg: ChatMessage = {
      id:        makeId(),
      role:      'user',
      content:   text.trim(),
      timestamp: new Date(),
    }
    addMessage(userMsg)
    setIsLoading(true)

    try {
      const history = [...messages.filter(m => m.id !== 'welcome'), userMsg]
        .map(m => ({ role: m.role, content: m.content }))

      const { data, error: fnError } = await supabase.functions.invoke('chat', {
        body: { messages: history, slots, menuContext },
      })

      if (fnError) throw fnError

      const raw     = (data as { content: string }).content
      const parsed  = parseIntent(raw)
      const visible = stripIntent(raw)

      const assistantMsg: ChatMessage = {
        id:        makeId(),
        role:      'assistant',
        content:   visible,
        timestamp: new Date(),
      }
      addMessage(assistantMsg)
      if (parsed) setIntent(parsed)
    } catch {
      setError('No se pudo contactar al asistente. Revisá tu conexión.')
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, slots, menuContext, addMessage, setIntent, setError])

  return { messages, intent, isLoading, error, sendMessage, reset }
}
