// src/components/reservation/ReviewModal.tsx
// Modal para dejar una reseña (1-5 estrellas + comentario opcional)
// después de una reserva completada.

import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateReview, useReviewForReservation } from '@/hooks/useReviews'
import type { Reservation } from '@/types'

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
export default function ReviewModal({ reservation, onClose }: Props) {
  const [rating,  setRating]  = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')

  const { data: existingReview, isLoading } = useReviewForReservation(reservation.id)
  const createReview = useCreateReview()

  const alreadyReviewed = !!existingReview

  const activeRating = hovered || rating

  async function handleSubmit() {
    if (rating === 0) return
    await createReview.mutateAsync({
      reservation_id: reservation.id,
      rating,
      comment: comment.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-background shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-base">Deja tu reseña</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-32 bg-muted rounded animate-pulse mx-auto" />
              <div className="h-10 w-48 bg-muted rounded animate-pulse mx-auto" />
            </div>
          ) : alreadyReviewed ? (
            /* Ya reseñada */
            <div className="text-center space-y-3 py-4">
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`h-8 w-8 ${i <= existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">Ya dejaste tu reseña</p>
              {existingReview.comment && (
                <p className="text-sm text-muted-foreground italic">"{existingReview.comment}"</p>
              )}
            </div>
          ) : (
            /* Formulario de nueva reseña */
            <>
              {/* Info de la reserva */}
              <div className="text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {reservation.date} · Mesa #{reservation.table?.number}
                </p>
                <p>¿Cómo fue tu experiencia?</p>
              </div>

              {/* Estrellas */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${i} estrellas`}
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        i <= activeRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Label de rating */}
              {activeRating > 0 && (
                <p className="text-center text-sm font-medium text-amber-600">
                  {['', '¡Muy malo!', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!'][activeRating]}
                </p>
              )}

              {/* Comentario */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  Comentario <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Cuéntanos tu experiencia…"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  disabled={rating === 0 || createReview.isPending}
                  onClick={handleSubmit}
                >
                  {createReview.isPending ? 'Enviando…' : 'Enviar reseña'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
