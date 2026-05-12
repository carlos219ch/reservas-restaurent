import { Link } from 'react-router-dom'
import { CalendarPlus, ClipboardList, UtensilsCrossed } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { profile } = useAuth()

  return (
    <div className="px-4 py-12 md:py-20 max-w-3xl mx-auto space-y-12">

      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Hola, {profile?.full_name?.split(' ')[0] ?? 'bienvenido'}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Gestiona tus reservas de forma rápida y sencilla.
        </p>
      </div>

      {/* Acciones rápidas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <div className="flex items-center gap-3">
            <CalendarPlus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Nueva reserva</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Elige fecha, hora y mesa disponible.
          </p>
          <Button asChild className="w-full">
            <Link to="/reservar">Reservar ahora</Link>
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-3">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Mis reservas</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Consulta, confirma o cancela tus reservas.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/mis-reservas">Ver reservas</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
