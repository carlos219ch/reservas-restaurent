import { Navigate } from 'react-router-dom'
import { CheckCircle2, Clock, MapPin, UtensilsCrossed, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { usePendingRestaurants, useApproveRestaurant } from '@/hooks/useRestaurants'
import { Button } from '@/components/ui/button'
import { toast } from '@/store/toastStore'

export default function ApprovalsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const { data: pending = [], isLoading } = usePendingRestaurants()
  const approveMutation = useApproveRestaurant()

  if (authLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (!isSuperAdmin) return <Navigate to="/admin" replace />

  async function handleApprove(id: string, name: string) {
    await approveMutation.mutateAsync({ id, approve: true })
    toast.success(`"${name}" aprobado y visible en la plataforma`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aprobaciones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Restaurantes pendientes de verificación antes de aparecer en la plataforma
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Todo al día</p>
          <p className="text-sm mt-1">No hay restaurantes pendientes de aprobación</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {pending.length} restaurante{pending.length !== 1 ? 's' : ''} esperando aprobación
            </p>
          </div>

          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id}
                className="rounded-xl border bg-card p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {r.cover_image_url
                      ? <img src={r.cover_image_url} alt={r.name} className="h-full w-full object-cover" />
                      : <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{r.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {r.cuisine_type && <span>{r.cuisine_type}</span>}
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.zone ? `${r.zone}, ` : ''}{r.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Registrado {format(parseISO(r.created_at), "d 'de' MMM yyyy", { locale: es })}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 max-w-lg">
                        {r.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(r.id, r.name)}
                    disabled={approveMutation.isPending}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.error(`Para rechazar "${r.name}", eliminalo desde Supabase o contactá al solicitante.`)}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
