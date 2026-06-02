import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UtensilsCrossed, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
interface RestaurantFields {
  restaurantName: string
  cuisineType:    string
  city:           string
  zone:           string
  address:        string
  phone:          string
  priceRange:     string
  description:    string
}

interface AccountFields {
  fullName:        string
  email:           string
  password:        string
  confirmPassword: string
}

type Step = 'restaurant' | 'account' | 'success'

const CUISINE_OPTIONS = [
  'Argentina', 'Italiana', 'Japonesa', 'Mediterránea', 'Mexicana',
  'Peruana', 'Española', 'Francesa', 'Americana', 'Asiática', 'Vegana', 'Otra',
]

const PRICE_OPTIONS = [
  { value: '1', label: '$',    desc: 'Económico (hasta $3.000)' },
  { value: '2', label: '$$',   desc: 'Moderado ($3.000 – $7.000)' },
  { value: '3', label: '$$$',  desc: 'Elaborado ($7.000 – $15.000)' },
  { value: '4', label: '$$$$', desc: 'Premium (más de $15.000)' },
]

// ----------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------
export default function JoinPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('restaurant')
  const [loading, setLoading]   = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [restaurant, setRestaurant] = useState<RestaurantFields>({
    restaurantName: '',
    cuisineType:    '',
    city:           'Buenos Aires',
    zone:           '',
    address:        '',
    phone:          '',
    priceRange:     '2',
    description:    '',
  })

  const [account, setAccount] = useState<AccountFields>({
    fullName:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
  })

  const [restaurantErrors, setRestaurantErrors] = useState<Partial<RestaurantFields>>({})
  const [accountErrors,    setAccountErrors]    = useState<Partial<AccountFields>>({})

  // ---- Validaciones ----
  function validateRestaurant(): boolean {
    const errors: Partial<RestaurantFields> = {}
    if (!restaurant.restaurantName.trim()) errors.restaurantName = 'Requerido'
    if (!restaurant.city.trim())           errors.city           = 'Requerido'
    setRestaurantErrors(errors)
    return Object.keys(errors).length === 0
  }

  function validateAccount(): boolean {
    const errors: Partial<AccountFields> = {}
    if (!account.fullName.trim())                                    errors.fullName        = 'Requerido'
    if (!account.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) errors.email = 'Correo inválido'
    if (!account.password || account.password.length < 6)            errors.password        = 'Mínimo 6 caracteres'
    if (account.password !== account.confirmPassword)                errors.confirmPassword  = 'No coinciden'
    setAccountErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ---- Paso 1 → 2 ----
  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    if (validateRestaurant()) setStep('account')
  }

  // ---- Paso 2: crear cuenta + restaurante ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateAccount()) return

    setLoading(true)
    setServerError(null)

    try {
      // 1. Crear cuenta Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:    account.email,
        password: account.password,
        options: {
          data: { full_name: account.fullName.trim() },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setServerError('Este correo ya está registrado')
        } else {
          setServerError('Error al crear la cuenta. Intentá de nuevo.')
        }
        setLoading(false)
        return
      }

      const userId = authData.user?.id
      if (!userId) throw new Error('No se pudo obtener el ID del usuario')

      // 2. Crear restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name:         restaurant.restaurantName.trim(),
          cuisine_type: restaurant.cuisineType        || null,
          city:         restaurant.city.trim(),
          zone:         restaurant.zone.trim()         || null,
          address:      restaurant.address.trim()      || null,
          phone:        restaurant.phone.trim()        || null,
          description:  restaurant.description.trim() || null,
          price_range:  parseInt(restaurant.priceRange),
        })
        .select()
        .single()

      if (restaurantError) throw new Error(restaurantError.message)

      // 3. Upsert del perfil con role=admin + restaurant_id
      // Usamos upsert porque el trigger de Supabase puede no haber corrido aún
      // o puede haber creado el perfil con role='cliente' antes de que llegáramos aquí.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id:            userId,
          full_name:     account.fullName.trim(),
          role:          'admin',
          restaurant_id: restaurantData.id,
        })

      if (profileError) throw new Error(profileError.message)

      setStep('success')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F7F8F6] dark:bg-background">

      {/* Navbar */}
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <UtensilsCrossed className="h-5 w-5" />
            MesaFácil
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">

        {/* Progreso */}
        {step !== 'success' && (
          <div className="flex items-center gap-2 mb-8">
            {(['restaurant', 'account'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${step === s
                    ? 'bg-primary text-primary-foreground'
                    : (step === 'account' && s === 'restaurant') || step === 'success'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'}`}
                >
                  {(step === 'account' && s === 'restaurant') ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-sm ${step === s ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {s === 'restaurant' ? 'Tu restaurante' : 'Tu cuenta'}
                </span>
                {i === 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
              </div>
            ))}
          </div>
        )}

        {/* ── Paso 1: datos del restaurante ── */}
        {step === 'restaurant' && (
          <form onSubmit={handleNextStep} className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold">Registrá tu restaurante</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Completá los datos de tu local para sumarte a la plataforma.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 space-y-5">

              <Field label="Nombre del restaurante *" error={restaurantErrors.restaurantName}>
                <input
                  value={restaurant.restaurantName}
                  onChange={e => setRestaurant(p => ({ ...p, restaurantName: e.target.value }))}
                  placeholder="Ej. La Parrilla de Juan"
                  className={inputClass(!!restaurantErrors.restaurantName)}
                />
              </Field>

              <Field label="Tipo de cocina">
                <select
                  value={restaurant.cuisineType}
                  onChange={e => setRestaurant(p => ({ ...p, cuisineType: e.target.value }))}
                  className={inputClass(false)}
                >
                  <option value="">Seleccioná un tipo</option>
                  {CUISINE_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Ciudad *" error={restaurantErrors.city}>
                  <input
                    value={restaurant.city}
                    onChange={e => setRestaurant(p => ({ ...p, city: e.target.value }))}
                    placeholder="Buenos Aires"
                    className={inputClass(!!restaurantErrors.city)}
                  />
                </Field>
                <Field label="Barrio / Zona">
                  <input
                    value={restaurant.zone}
                    onChange={e => setRestaurant(p => ({ ...p, zone: e.target.value }))}
                    placeholder="Palermo, San Telmo…"
                    className={inputClass(false)}
                  />
                </Field>
              </div>

              <Field label="Dirección">
                <input
                  value={restaurant.address}
                  onChange={e => setRestaurant(p => ({ ...p, address: e.target.value }))}
                  placeholder="Av. Corrientes 1234"
                  className={inputClass(false)}
                />
              </Field>

              <Field label="Teléfono">
                <input
                  value={restaurant.phone}
                  onChange={e => setRestaurant(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+54 11 1234-5678"
                  className={inputClass(false)}
                />
              </Field>

              <Field label="Rango de precios">
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRestaurant(p => ({ ...p, priceRange: opt.value }))}
                      className={`p-3 rounded-xl border text-left transition-colors
                        ${restaurant.priceRange === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'}`}
                    >
                      <p className="font-bold text-sm text-primary">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Descripción breve">
                <textarea
                  value={restaurant.description}
                  onChange={e => setRestaurant(p => ({ ...p, description: e.target.value }))}
                  placeholder="Contanos sobre tu restaurante…"
                  rows={3}
                  className={`${inputClass(false)} resize-none`}
                />
              </Field>
            </div>

            <Button type="submit" className="w-full">
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-primary hover:underline">Iniciá sesión</Link>
            </p>
          </form>
        )}

        {/* ── Paso 2: datos de la cuenta ── */}
        {step === 'account' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <button
                type="button"
                onClick={() => setStep('restaurant')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ChevronLeft className="h-4 w-4" /> Volver
              </button>
              <h1 className="text-2xl font-bold">Creá tu cuenta de administrador</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Con esta cuenta vas a gestionar <strong>{restaurant.restaurantName}</strong>.
              </p>
            </div>

            {serverError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="rounded-xl border bg-card p-6 space-y-5">

              <Field label="Tu nombre completo *" error={accountErrors.fullName}>
                <input
                  value={account.fullName}
                  onChange={e => setAccount(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="Juan Pérez"
                  className={inputClass(!!accountErrors.fullName)}
                />
              </Field>

              <Field label="Correo electrónico *" error={accountErrors.email}>
                <input
                  type="email"
                  value={account.email}
                  onChange={e => setAccount(p => ({ ...p, email: e.target.value }))}
                  placeholder="tu@correo.com"
                  className={inputClass(!!accountErrors.email)}
                />
              </Field>

              <Field label="Contraseña *" error={accountErrors.password}>
                <input
                  type="password"
                  value={account.password}
                  onChange={e => setAccount(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass(!!accountErrors.password)}
                />
              </Field>

              <Field label="Confirmar contraseña *" error={accountErrors.confirmPassword}>
                <input
                  type="password"
                  value={account.confirmPassword}
                  onChange={e => setAccount(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={inputClass(!!accountErrors.confirmPassword)}
                />
              </Field>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando tu restaurante…</>
                : 'Registrar restaurante'}
            </Button>
          </form>
        )}

        {/* ── Éxito ── */}
        {step === 'success' && (
          <div className="text-center space-y-5 py-10">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">¡Bienvenido a MesaFácil!</h1>
              <p className="text-muted-foreground text-sm mt-2">
                <strong>{restaurant.restaurantName}</strong> ya está en la plataforma.
                Accedé al panel admin para configurar tus mesas, horarios y carta.
              </p>
            </div>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button onClick={() => navigate('/admin')} className="w-full">
                Ir al panel admin
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Ver la plataforma
              </Button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

// ----------------------------------------------------------------
// Helpers de UI
// ----------------------------------------------------------------
function inputClass(hasError: boolean) {
  return `w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors
    focus:ring-2 focus:ring-ring
    ${hasError ? 'border-destructive focus:ring-destructive' : 'border-input'}`
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
