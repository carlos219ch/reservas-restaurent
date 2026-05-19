import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useChatStore } from '@/store/chatStore'
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

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------
export function useChat(slots: string[]) {
  const { messages, intent, error, addMessage, setIntent, setError, reset } = useChatStore()
  const [isLoading, setIsLoading] = useState(false)

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
      addMessage(assistantMsg)
      if (parsed) setIntent(parsed)
    } catch {
      setError('No se pudo contactar al asistente. Revisá tu conexión.')
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, slots, addMessage, setIntent, setError])

  return { messages, intent, isLoading, error, sendMessage, reset }
}
