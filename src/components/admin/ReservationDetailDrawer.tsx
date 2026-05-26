// src/components/admin/ReservationDetailDrawer.tsx
// Drawer deslizante (derecha) con el detalle completo de una reserva.
// Incluye: datos del cliente, historial, notas admin editables y acciones.

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  X, User, Phone, Calendar, Clock, Users, MapPin,
  FileText, ShieldAlert, Save, History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useUpdateReservation } from '@/hooks/useReservations'
import { toast } from '@/store/toastStore'
import type { Reservation, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Status helpers
// ----------------------------------------------------------------
const STATUS_STYLES: Record<ReservationStatus, string> = {
  pendiente:  'bg-amber-100 text-amber-700',
  confirmada: 'bg-green-100 text-green-700',
  cancelada:  'bg-gray-100 text-gray-500',
  completada: 'bg-blue-100 text-blue-700',
  no_show:    'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<ReservationStatus, string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  cancelada:  'Cancelada',
  completada: 'Completada',
  no_show:    'No show',
}

// ----------------------------------------------------------------
// Hook: historial de reservas del cliente
// ----------------------------------------------------------------
function useClientHistory(userId: string | null, currentId: string) {
  return useQuery({
    queryKey: ['client-history', userId],
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, table:tables(*, zone:zones(*)), time_slot:time_slots(*)')
        .eq('user_id', userId!)
        .neq('id', currentId)
        .order('date', { ascending: false })
        .limit(5)
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!userId,
  })
}

// ----------------------------------------------------------------
// Hook: guardar notas admin
// ----------------------------------------------------------------
function useSaveAdminNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('reservations')
        .update({ admin_notes: notes || null })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Notas guardadas')
    },
    onError: () => toast.error('Error al guardar notas'),
  })
}

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------
interface Props {
  reservation: Reservation
  onClose:     () => void
}

// ----------------------------------------------------------------
// Componente
// ----------------------------------------------------------------
export default function ReservationDetailDrawer({ reservation: r, onClose }: Props) {
  const [adminNotes, setAdminNotes] = useState(r.admin_notes ?? '')
  const notesAreDirty = adminNotes !== (r.admin_notes ?? '')

  const historyQuery  = useClientHistory(r.user_id, r.id)
  const saveNotes     = useSaveAdminNotes()
  const updateStatus  = useUpdateReservation()

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleStatus(status: ReservationStatus) {
    updateStatus.mutate({ id: r.id, status }, {
      onSuccess: () => {
        toast.success(`Reserva marcada como ${STATUS_LABELS[status]}`)
        onClose()
      },
      onError: () => toast.error('Error al actualizar estado'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-background h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-base">Detalle de reserva</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Status badge + fecha */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
              {STATUS_LABELS[r.status]}
            </span>
            {r.no_show_risk != null && r.no_show_risk > 50 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Riesgo no-show: {r.no_show_risk}%</span>
              </div>
            )}
          </div>

          {/* Detalles de la reserva */}
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Reserva
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="capitalize">
                  {format(parseISO(r.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{r.time_slot?.slot_time.slice(0, 5) ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{r.guests} {r.guests === 1 ? 'persona' : 'personas'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  Mesa #{r.table?.number}
                  {r.table?.zone ? ` · ${r.table.zone.name}` : ''}
                </span>
              </div>
              {r.occasion !== 'ninguna' && (
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-4 text-center text-muted-foreground">🎉</span>
                  <span className="capitalize">{r.occasion}</span>
                </div>
              )}
              {r.notes && (
                <div className="flex items-start gap-2.5 pt-1 border-t">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="italic text-muted-foreground">"{r.notes}"</span>
                </div>
              )}
            </div>
          </section>

          {/* Datos del cliente */}
          {r.profile && (
            <section className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Cliente
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{r.profile.full_name}</span>
                </div>
                {r.profile.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a
                      href={`tel:${r.profile.phone}`}
                      className="text-primary hover:underline"
                    >
                      {r.profile.phone}
                    </a>
                  </div>
                )}
                {r.profile.allergies?.length ? (
                  <div className="text-xs rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-3 py-2">
                    ⚠️ Alergias: {r.profile.allergies.join(', ')}
                  </div>
                ) : null}
                {r.profile.preferences && (
                  <div className="text-xs text-muted-foreground italic">
                    Preferencias: {r.profile.preferences}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Historial del cliente */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Últimas visitas
              </h3>
            </div>
            {historyQuery.isLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : !historyQuery.data?.length ? (
              <p className="text-xs text-muted-foreground">Sin historial previo.</p>
            ) : (
              <div className="space-y-1.5">
                {historyQuery.data.map(prev => (
                  <div
                    key={prev.id}
                    className="flex items-center justify-between text-xs rounded-lg border bg-card px-3 py-2"
                  >
                    <span className="text-muted-foreground capitalize">
                      {format(parseISO(prev.date), "d MMM yyyy", { locale: es })}
                      {' · '}
                      {prev.time_slot?.slot_time.slice(0, 5)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[prev.status]}`}>
                      {STATUS_LABELS[prev.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notas admin */}
          <section className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
              Notas internas (solo admin)
            </label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Observaciones, preferencias especiales…"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            {notesAreDirty && (
              <Button
                size="sm"
                className="w-full gap-2"
                disabled={saveNotes.isPending}
                onClick={() => saveNotes.mutate({ id: r.id, notes: adminNotes })}
              >
                <Save className="h-3.5 w-3.5" />
                {saveNotes.isPending ? 'Guardando…' : 'Guardar notas'}
              </Button>
            )}
          </section>

        </div>

        {/* Footer — acciones rápidas */}
        <div className="border-t px-6 py-4 shrink-0 space-y-2">
          {r.status === 'pendiente' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('cancelada')}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('confirmada')}
              >
                Confirmar
              </Button>
            </div>
          )}
          {r.status === 'confirmada' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('no_show')}
                className="text-destructive hover:text-destructive"
              >
                No show
              </Button>
              <Button
                size="sm"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus('completada')}
              >
                Completada
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
