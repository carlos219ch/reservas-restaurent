import ReservationForm from '@/components/reservation/ReservationForm'

export default function ReservePage() {
  return (
    <div className="px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Nueva reserva</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Elige fecha, horario y mesa para tu visita.
        </p>
      </div>
      <ReservationForm />
    </div>
  )
}
