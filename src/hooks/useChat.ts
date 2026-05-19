import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChatMessage, ReservationIntent } from '@/types'

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

const WELCOME: ChatMessage = {
  id:        'welcome',
  role:      'assistant',
  content:   '¡Hola! Soy el asistente de reservas de Mesa Fácil 🍽️\n¿Para qué fecha y cuántas personas querés reservar?',
  timestamp: new Date(),
}

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------
export function useChat(slots: string[]) {
  const [messages, setMessages]   = useState<ChatMessage[]>([WELCOME])
  const [intent,   setIntent]     = useState<ReservationIntent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    setError(null)

    const userMsg: ChatMessage = {
      id:        makeId(),
      role:      'user',
      content:   text.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Build history for the API (skip the welcome message)
      const history = [...messages.filter(m => m.id !== 'welcome'), userMsg]
        .map(m => ({ role: m.role, content: m.content }))

      const { data, error: fnError } = await supabase.functions.invoke('chat', {
        body: { messages: history, slots },
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
      setMessages(prev => [...prev, assistantMsg])
      if (parsed) setIntent(parsed)
    } catch (err) {
      setError('No se pudo contactar al asistente. Revisá tu conexión.')
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, slots])

  const reset = useCallback(() => {
    setMessages([WELCOME])
    setIntent(null)
    setError(null)
  }, [])

  return { messages, intent, isLoading, error, sendMessage, reset }
}
