// src/components/reservation/QRModal.tsx
//
// Modal con QR de check-in para una reserva.
// El QR codifica el ID único; el staff lo escanea en el panel admin.

import { useRef } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { QRCodeCanvas } from 'qrcode.react'
import { X, Download, Clock, Users, MapPin, UtensilsCrossed } from 'lucide-react'
import type { Reservation } from '@/types'

interface QRModalProps {
  reservation: Reservation
  onClose: () => void
}

export default function QRModal({ reservation: r, onClose }: QRModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const dateLabel = format(new Date(r.date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })
  const time      = r.time_slot?.slot_time.slice(0, 5) ?? '—'
  const table     = r.table ? `Mesa #${r.table.number}${r.table.zone ? ` · ${r.table.zone.name}` : ''}` : '—'

  // El QR codifica el ID de la reserva con prefijo identificador
  const qrValue = `MESAFACIL:${r.id}`

  function handleDownload() {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return
    const url  = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `reserva-${r.id.slice(0, 8)}.png`
    link.href = url
    link.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden
                      animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">QR de check-in</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                       hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center px-6 pt-6 pb-4">

          {/* Código QR */}
          <div
            ref={canvasRef}
            className="p-4 rounded-2xl bg-white shadow-md ring-1 ring-black/5"
          >
            <QRCodeCanvas
              value={qrValue}
              size={180}
              bgColor="#ffffff"
              fgColor="#0F2557"
              level="M"
              marginSize={1}
            />
          </div>

          {/* Instrucción */}
          <p className="text-xs text-muted-foreground text-center mt-3 leading-relaxed">
            Mostrá este código al llegar al restaurante.<br />
            El staff lo escaneará para confirmar tu llegada.
          </p>
        </div>

        {/* Detalles de la reserva */}
        <div className="mx-5 mb-4 rounded-xl bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="capitalize font-medium">{dateLabel}</span>
            <span className="text-muted-foreground">· {time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{table}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{r.guests} {r.guests === 1 ? 'persona' : 'personas'}</span>
          </div>
        </div>

        {/* ID corto */}
        <p className="text-center text-[10px] text-muted-foreground/50 pb-1 font-mono">
          ID: {r.id.slice(0, 8).toUpperCase()}
        </p>

        {/* Botón descargar */}
        <div className="px-5 pb-5">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                       bg-primary text-primary-foreground text-sm font-medium
                       hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Guardar imagen
          </button>
        </div>
      </div>
    </div>
  )
}
