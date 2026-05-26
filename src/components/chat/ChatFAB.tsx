// src/components/chat/ChatFAB.tsx
//
// Floating Action Button + panel lateral glassmorphism.
// Usa bg-primary / text-primary → color global desde index.css

import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Send, Bot, User, CheckCircle2, RefreshCw, X, Sparkles,
} from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { useAvailability } from '@/hooks/useAvailability'
import { useCreateReservation } from '@/hooks/useReservations'
import { useMenuItems } from '@/hooks/useMenuItems'

export default function ChatFAB() {
  const [open, setOpen]       = useState(false)
  const [success, setSuccess] = useState(false)
  const [input, setInput]     = useState('')
  const bottomRef             = useRef<HTMLDivElement>(null)

  const { data: slots = [] }     = useTimeSlots()
  const { data: menuItems = [] } = useMenuItems()
  const slotLabels               = slots.map(s => s.slot_time.slice(0, 5))

  const { messages, intent, isLoading, error, sendMessage, reset } = useChat(slotLabels, menuItems)
  const createReservation = useCreateReservation()

  const matchedSlot = slots.find(s => s.slot_time.startsWith(intent?.time ?? '__'))
  const { tablesWithAvailability } = useAvailability(
    intent?.date ?? null,
    matchedSlot?.id ?? null,
  )
  const availableTable = tablesWithAvailability.find(
    t => t.availability === 'disponible' && t.capacity >= (intent?.guests ?? 0),
  )
  const canBook = !!(intent?.date && intent.time && intent.guests && matchedSlot && availableTable)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, open])

  function handleConfirm() {
    if (!canBook) return
    createReservation.mutate(
      {
        date:         intent!.date!,
        time_slot_id: matchedSlot!.id,
        table_id:     availableTable!.id,
        guests:       intent!.guests!,
        occasion:     intent!.occasion ?? 'ninguna',
        notes:        intent!.notes?.trim() || undefined,
      },
      { onSuccess: () => setSuccess(true) },
    )
  }

  function handleSend() {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  function handleReset() {
    reset()
    setSuccess(false)
  }

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panel glassmorphism ───────────────────────── */}
      <div
        className={[
          'fixed z-50 flex flex-col overflow-hidden',
          'bg-white/92 dark:bg-zinc-900/92 backdrop-blur-2xl',
          'border border-white/50 dark:border-white/10',
          'shadow-2xl shadow-black/20',
          // Mobile: encima de la bottom-nav (bottom-16)
          'bottom-16 left-0 right-0 rounded-t-3xl',
          // Desktop: panel flotante
          'md:left-auto md:right-6 md:bottom-[5.5rem] md:w-[370px] md:rounded-2xl',
          'transition-all duration-300 ease-in-out',
          open
            ? 'h-[75dvh] md:h-[560px] opacity-100 md:translate-y-0'
            : 'h-0 md:h-0 opacity-0 pointer-events-none md:translate-y-3',
        ].join(' ')}
      >
        {/* ── Header — usa bg-primary global ─── */}
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0
                        bg-primary text-primary-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold">Asistente IA</p>
              <p className="text-[11px] opacity-50 mt-0.5">Mesa Fácil · Groq</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleReset}
              title="Nueva conversación"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Pantalla de éxito ─── */}
        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">¡Reserva confirmada!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tu reserva quedó registrada. Podés verla en "Mis reservas".
            </p>
            <button
              onClick={handleReset}
              className="mt-1 px-5 py-2 rounded-xl bg-primary text-primary-foreground
                         text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Nueva reserva
            </button>
          </div>
        ) : (
          <>
            {/* ── Mensajes ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center ${
                    msg.role === 'assistant'
                      ? 'bg-primary/10'
                      : 'bg-gray-100 dark:bg-zinc-800'
                  }`}>
                    {msg.role === 'assistant'
                      ? <Bot className="h-3.5 w-3.5 text-primary" />
                      : <User className="h-3.5 w-3.5 text-gray-500" />
                    }
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-gray-100 dark:bg-zinc-800 text-foreground rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/10
                                  flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl rounded-tl-sm
                                  px-4 py-3 flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive text-center py-1">{error}</p>
              )}

              {/* Tarjeta de resumen */}
              {canBook && !createReservation.isSuccess && (
                <div className="rounded-xl border border-primary/20
                                bg-primary/5 p-4 space-y-3">
                  <p className="text-sm font-semibold text-primary">
                    ✨ Resumen de tu reserva
                  </p>
                  <dl className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Fecha</dt>
                      <dd className="font-medium capitalize">
                        {format(parseISO(intent!.date!), "EEEE d 'de' MMMM", { locale: es })}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Hora</dt>
                      <dd className="font-medium">{intent!.time}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Personas</dt>
                      <dd className="font-medium">{intent!.guests}</dd>
                    </div>
                    {intent?.occasion && intent.occasion !== 'ninguna' && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Ocasión</dt>
                        <dd className="font-medium capitalize">{intent.occasion}</dd>
                      </div>
                    )}
                  </dl>
                  <button
                    disabled={createReservation.isPending}
                    onClick={handleConfirm}
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground
                               text-sm font-medium hover:bg-primary/90 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createReservation.isPending ? 'Reservando…' : 'Confirmar reserva'}
                  </button>
                </div>
              )}

              {createReservation.isError && (
                <p className="text-xs text-destructive text-center">
                  {createReservation.error instanceof Error
                    ? createReservation.error.message
                    : 'Error al crear la reserva.'}
                </p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Input ─── */}
            <div className="shrink-0 border-t border-black/5 dark:border-white/10 px-3 py-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Escribe tu mensaje…"
                disabled={isLoading}
                className="flex-1 rounded-xl border bg-white/60 dark:bg-zinc-800/60
                           px-4 py-2 text-sm outline-none
                           focus:ring-2 focus:ring-primary/25
                           placeholder:text-muted-foreground/60 disabled:opacity-50"
              />
              <button
                disabled={isLoading || !input.trim()}
                onClick={handleSend}
                className="h-9 w-9 rounded-xl bg-primary text-primary-foreground
                           flex items-center justify-center shrink-0
                           hover:bg-primary/90 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── FAB Button ───────────────────────────────── */}
      {/* Mobile: bottom-[5.5rem] para quedar sobre la bottom-nav */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
        style={{ height: '52px', width: '52px' }}
        className={[
          'fixed z-50 rounded-full',
          'right-4 bottom-[5.5rem]',          // mobile: sobre la bottom-nav
          'md:right-6 md:bottom-6',            // desktop: esquina estándar
          'bg-primary shadow-lg shadow-primary/40',
          'flex items-center justify-center text-primary-foreground',
          'transition-all duration-300',
          'hover:scale-105 hover:shadow-xl hover:shadow-primary/50 hover:bg-primary/90',
          'active:scale-95',
          open ? 'rotate-90' : 'rotate-0',
        ].join(' ')}
      >
        {open
          ? <X className="h-5 w-5" />
          : <Sparkles className="h-5 w-5 text-amber-300" />
        }
      </button>
    </>
  )
}
