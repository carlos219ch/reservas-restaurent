import { create } from 'zustand'
import type { ChatMessage, ReservationIntent } from '@/types'

const WELCOME: ChatMessage = {
  id:        'welcome',
  role:      'assistant',
  content:   '¡Hola! Soy el asistente de reservas de Mesa Fácil 🍽️\n¿Para qué fecha y cuántas personas querés reservar?',
  timestamp: new Date(),
}

interface ChatStore {
  messages: ChatMessage[]
  intent:   ReservationIntent | null
  error:    string | null
  addMessage:  (msg: ChatMessage) => void
  setIntent:   (intent: ReservationIntent | null) => void
  setError:    (error: string | null) => void
  reset:       () => void
}

export const useChatStore = create<ChatStore>(set => ({
  messages: [WELCOME],
  intent:   null,
  error:    null,
  addMessage:  msg    => set(s => ({ messages: [...s.messages, msg] })),
  setIntent:   intent => set({ intent }),
  setError:    error  => set({ error }),
  reset:       ()     => set({ messages: [WELCOME], intent: null, error: null }),
}))
