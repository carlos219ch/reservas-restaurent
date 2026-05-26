// src/components/ui/Toaster.tsx
// Contenedor global de toasts — montar una sola vez en App.tsx

import { useEffect } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, type Toast } from '@/store/toastStore'

// ----------------------------------------------------------------
// Icono y estilos por tipo
// ----------------------------------------------------------------
const STYLES: Record<Toast['type'], { container: string; icon: React.ReactNode }> = {
  success: {
    container: 'border-green-200 bg-green-50 dark:bg-green-950/50 dark:border-green-800',
    icon: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
  },
  error: {
    container: 'border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-800',
    icon: <XCircle className="h-4 w-4 text-red-600 shrink-0" />,
  },
  info: {
    container: 'border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800',
    icon: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-800',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
  },
}

// ----------------------------------------------------------------
// Toast individual
// ----------------------------------------------------------------
function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore(s => s.remove)
  const { container, icon } = STYLES[toast.type]

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-md max-w-sm w-full',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        container,
      ].join(' ')}
      role="alert"
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => remove(toast.id)}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Cerrar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ----------------------------------------------------------------
// Contenedor global (bottom-right)
// ----------------------------------------------------------------
export function Toaster() {
  const toasts = useToastStore(s => s.toasts)

  // Inicializar tema oscuro en cuanto carga la app
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end"
      aria-live="polite"
    >
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
