// src/components/admin/QRScannerModal.tsx
//
// Modal de check-in para staff: lee el código QR del cliente,
// busca la reserva y permite confirmarla.

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  X, QrCode, Search, CheckCircle2, XCircle, AlertTriangle,
  Clock, Users, MapPin, User, Loader2, ScanLine,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUpdateReservation } from '@/hooks/useReservations'
import type { Reservation, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function parseQR(raw: string): string {
  const s = raw.trim()
  // Acepta "MESAFACIL:UUID" o directamente un UUID
  if (s.startsWith('MESAFACIL:')) return s.replace('MESAFACIL:', '').trim()
  return s
}

const STATUS_CONFIG: Record<ReservationStatus, {
  label: string
  icon: React.ReactNode
  color: string
  bg: string
}> = {
  pendiente:  { label: 'Pendiente',  icon: <AlertTriangle className="h-5 w-5" />,  color: 'text-amber-600',  bg: 'bg-amber-50  dark:bg-amber-950/30'  },
  confirmada: { label: 'Confirmada', icon: <CheckCircle2  className="h-5 w-5" />,  color: 'text-green-600',  bg: 'bg-green-50  dark:bg-green-950/30'  },
  cancelada:  { label: 'Cancelada',  icon: <XCircle       className="h-5 w-5" />,  color: 'text-red-500',    bg: 'bg-red-50    dark:bg-red-950/30'     },
  completada: { label: 'Completada', icon: <CheckCircle2  className="h-5 w-5" />,  color: 'text-blue-600',   bg: 'bg-blue-50   dark:bg-blue-950/30'   },
  no_show:    { label: 'No asistió', icon: <XCircle       className="h-5 w-5" />,  color: 'text-red-400',    bg: 'bg-red-50    dark:bg-red-950/30'     },
}

// ----------------------------------------------------------------
// Modal
// ----------------------------------------------------------------
interface Props {
  onClose: () => void
}

export default function QRScannerModal({ onClose }: Props) {
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [notFound,    setNotFound]    = useState(false)
  const [confirmed,   setConfirmed]   = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const updateMutation = useUpdateReservation()

  // Autofoco al abrir (los lectores de QR físicos actúan como teclado)
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  async function lookup(raw = input) {
    const id = parseQR(raw)
    if (!id) return

    setLoading(true)
    setNotFound(false)
    setReservation(null)
    setConfirmed(false)

    const { data, error } = await supabase
      .from('reservations')
      .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*), profile:profiles(*)')
      .eq('id', id)
      .single()

    setLoading(false)

    if (error || !data) {
      setNotFound(true)
    } else {
      setReservation(data as Reservation)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') lookup()
  }

  function handleConfirmArrival() {
    if (!reservation) return
    // Si está pendiente → confirmar; si ya está confirmada → marcar como presente (completada)
    const newStatus: ReservationStatus = reservation.status === 'pendiente' ? 'confirmada' : 'completada'

    updateMutation.mutate(
      { id: reservation.id, status: newStatus },
      {
        onSuccess: (updated) => {
          setReservation(updated)
          setConfirmed(true)
        },
      },
    )
  }

  function handleReset() {
    setInput('')
    setReservation(null)
    setNotFound(false)
    setConfirmed(false)
    inputRef.current?.focus()
  }

  const cfg = reservation ? STATUS_CONFIG[reservation.status] : null
  const canConfirm = reservation &&
    (reservation.status === 'pendiente' || reservation.status === 'confirmada')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-semibold">Escáner de check-in</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                       hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Input de QR ── */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Escaneá el QR del cliente o pegá el código manualmente.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => { setInput(e.target.value); setNotFound(false) }}
                  onKeyDown={handleKeyDown}
                  placeholder="MESAFACIL:xxxxxxxx…"
                  className="w-full pl-9 pr-3 h-10 rounded-xl border bg-background text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/30
                             font-mono placeholder:font-sans placeholder:text-muted-foreground/60"
                />
              </div>
              <button
                onClick={() => lookup()}
                disabled={!input.trim() || loading}
                className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm
                           font-medium hover:bg-primary/90 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />
                }
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>
          </div>

          {/* ── No encontrado ── */}
          {notFound && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200
                            dark:border-red-900/40 p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Reserva no encontrada
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/60 mt-0.5">
                  Verificá que el código QR sea válido.
                </p>
              </div>
            </div>
          )}

          {/* ── Reserva encontrada ── */}
          {reservation && cfg && (
            <div className="rounded-xl border overflow-hidden">

              {/* Status banner */}
              <div className={`flex items-center gap-2.5 px-4 py-3 ${cfg.bg}`}>
                <span className={cfg.color}>{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${cfg.color}`}>
                    {confirmed
                      ? reservation.status === 'completada'
                        ? '¡Llegada registrada!'
                        : '¡Reserva confirmada!'
                      : cfg.label
                    }
                  </p>
                  {reservation.status === 'cancelada' && (
                    <p className="text-xs text-red-500/80 mt-0.5">
                      Esta reserva fue cancelada — no puede hacer check-in.
                    </p>
                  )}
                  {reservation.status === 'no_show' && (
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Esta reserva fue marcada como no asistió.
                    </p>
                  )}
                </div>
                {/* ID corto */}
                <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                  #{reservation.id.slice(0, 6).toUpperCase()}
                </span>
              </div>

              {/* Detalles */}
              <div className="p-4 space-y-2.5">

                {/* Cliente */}
                {reservation.profile && (
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary
                                    flex items-center justify-center text-xs font-bold shrink-0">
                      {reservation.profile.full_name.split(' ').slice(0,2).map(w => w[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{reservation.profile.full_name}</p>
                      {reservation.profile.phone && (
                        <p className="text-xs text-muted-foreground">{reservation.profile.phone}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="h-px bg-border" />

                {/* Info de la reserva */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="capitalize">
                      {format(new Date(reservation.date + 'T00:00:00'), "d MMM", { locale: es })}
                      {' · '}{reservation.time_slot?.slot_time.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      Mesa #{reservation.table?.number}
                      {reservation.table?.zone?.name ? ` · ${reservation.table.zone.name}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{reservation.guests} {reservation.guests === 1 ? 'persona' : 'personas'}</span>
                  </div>
                  {reservation.occasion && reservation.occasion !== 'ninguna' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="capitalize">{reservation.occasion}</span>
                    </div>
                  )}
                </div>

                {/* Alergias */}
                {reservation.profile?.allergies?.length ? (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                    ⚠️ Alergias: {reservation.profile.allergies.join(', ')}
                  </div>
                ) : null}

                {/* Notas */}
                {reservation.notes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2">
                    "{reservation.notes}"
                  </p>
                )}
              </div>

              {/* ── Acciones ── */}
              {canConfirm && !confirmed && (
                <div className="px-4 pb-4">
                  <button
                    disabled={updateMutation.isPending}
                    onClick={handleConfirmArrival}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground
                               text-sm font-medium hover:bg-primary/90 transition-colors
                               disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updateMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <CheckCircle2 className="h-4 w-4" />
                    }
                    {reservation.status === 'pendiente'
                      ? 'Confirmar reserva'
                      : 'Registrar llegada'
                    }
                  </button>
                </div>
              )}

              {confirmed && (
                <div className="px-4 pb-4">
                  <button
                    onClick={handleReset}
                    className="w-full py-2.5 rounded-xl border text-sm font-medium
                               hover:bg-muted transition-colors"
                  >
                    Escanear otro QR
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
