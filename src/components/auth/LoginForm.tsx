// src/components/auth/LoginForm.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
 
// -----------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------
interface LoginFields {
  email: string
  password: string
}
 
interface FieldErrors {
  email?: string
  password?: string
}
 
// -----------------------------------------------------------------
// Validación
// -----------------------------------------------------------------
function validateFields(fields: LoginFields): FieldErrors {
  const errors: FieldErrors = {}
 
  if (!fields.email) {
    errors.email = 'El correo es requerido'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Ingresa un correo válido'
  }
 
  if (!fields.password) {
    errors.password = 'La contraseña es requerida'
  } else if (fields.password.length < 6) {
    errors.password = 'Mínimo 6 caracteres'
  }
 
  return errors
}
 
// -----------------------------------------------------------------
// Componente
// -----------------------------------------------------------------
export default function LoginForm() {
  const [fields, setFields] = useState<LoginFields>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
 
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFields(prev => ({ ...prev, [name]: value }))
    // Limpiar error del campo al escribir
    setFieldErrors(prev => ({ ...prev, [name]: undefined }))
    setServerError(null)
  }
 
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
 
    const errors = validateFields(fields)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
 
    setLoading(true)
    setServerError(null)
 
    const { error } = await supabase.auth.signInWithPassword({
      email: fields.email,
      password: fields.password,
    })
 
    setLoading(false)
 
    if (error) {
      setServerError('Correo o contraseña incorrectos')
      return
    }
  }
 
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
 
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión para gestionar tu reserva
          </p>
        </div>
 
        {/* Formulario */}
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
 
            {/* Error de servidor */}
            {serverError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}
 
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={fields.email}
                onChange={handleChange}
                placeholder="tu@correo.com"
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors
                  focus:ring-2 focus:ring-ring
                  ${fieldErrors.email ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>
 
            {/* Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={fields.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors
                  focus:ring-2 focus:ring-ring
                  ${fieldErrors.password ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>
 
            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
 
          </form>
        </div>
 
        {/* Link a registro */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Regístrate aquí
          </Link>
        </p>
 
      </div>
    </div>
  )
}