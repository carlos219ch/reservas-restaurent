import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Bot, User, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/hooks/useChat'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { useAvailability } from '@/hooks/useAvailability'
import { useCreateReservation } from '@/hooks/useReservations'

// ----------------------------------------------------------------
// ChatPage
// ----------------------------------------------------------------
export default function ChatPage() {
  const navigate              = useNavigate()
  const [input, setInput]     = useState('')
  const [success, setSuccess] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  const { data: slots = [] }  = useTimeSlots()
  const slotLabels            = slots.map(s => s.slot_time.slice(0, 5))

  const { messages, intent, isLoading, error, sendMessage, reset } = useChat(slotLabels)
  const createReservation = useCreateReservation()

  // Derive time_slot_id and availability from intent
  const matchedSlot = slots.find(s => s.slot_time.startsWith(intent?.time ?? '__'))
  const { tablesWithAvailability } = useAvailability(
    intent?.date ?? null,
    matchedSlot?.id ?? null,
  )
  const availableTable = tablesWithAvailability.find(
    t => t.availability === 'disponible' && t.capacity >= (intent?.guests ?? 0),
  )

  const canBook = !!(intent?.date && intent.time && intent.guests && matchedSlot && availableTable)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-create when confirmed
  useEffect(() => {
    if (!intent?.confirmed || !canBook || createReservation.isPending || createReservation.isSuccess) return
    createReservation.mutate({
      date:         intent.date!,
      time_slot_id: matchedSlot!.id,
      table_id:     availableTable!.id,
      guests:       intent.guests!,
      occasion:     intent.occasion ?? 'ninguna',
      notes:        intent.notes?.trim() || undefined,
    }, {
      onSuccess: () => setSuccess(true),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.confirmed])

  function handleSend() {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  // ---- Success screen ----
  if (success) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <h2 className="text-xl font-semibold">¡Reserva confirmada!</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Tu reserva quedó registrada. Podés consultarla en "Mis reservas".
        </p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => navigate('/mis-reservas')}>
            Ver mis reservas
          </Button>
          <Button onClick={() => { reset(); setSuccess(false) }}>
            Nueva reserva
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Asistente de reservas</p>
            <p className="text-xs text-muted-foreground">Mesa Fácil IA</p>
          </div>
        </div>
        <button
          onClick={reset}
          title="Nueva conversación"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center ${
              msg.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="h-3.5 w-3.5 text-primary" />
                : <User className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive text-center py-1">{error}</p>
        )}

        {/* Intent summary card */}
        {canBook && !intent?.confirmed && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-primary">Resumen de tu reserva</p>
            <dl className="text-sm space-y-1">
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
            <p className="text-xs text-muted-foreground pt-1">
              Decile al asistente "confirmo" para reservar, o pedí cambios.
            </p>
          </div>
        )}

        {/* Creating reservation */}
        {createReservation.isPending && (
          <p className="text-xs text-muted-foreground text-center animate-pulse">Creando tu reserva…</p>
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

      {/* Input */}
      <div className="shrink-0 border-t px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Escribí tu mensaje…"
          disabled={isLoading}
          className="flex-1 rounded-xl border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
        <Button
          size="icon"
          disabled={isLoading || !input.trim()}
          onClick={handleSend}
          className="rounded-xl shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
