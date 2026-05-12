// src/components/auth/RegisterForm.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
 
// -----------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------
interface RegisterFields {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}
 
interface FieldErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
}
 
// -----------------------------------------------------------------
// Validación
// -----------------------------------------------------------------
function validateFields(fields: RegisterFields): FieldErrors {
  const errors: FieldErrors = {}
 
  if (!fields.fullName.trim()) {
    errors.fullName = 'El nombre es requerido'
  } else if (fields.fullName.trim().length < 3) {
    errors.fullName = 'Mínimo 3 caracteres'
  }
 
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
 
  if (!fields.confirmPassword) {
    errors.confirmPassword = 'Confirma tu contraseña'
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden'
  }
 
  return errors
}
 
// -----------------------------------------------------------------
// Componente
// -----------------------------------------------------------------
export default function RegisterForm() {
  const navigate = useNavigate()
 
  const [fields, setFields] = useState<RegisterFields>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
 
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFields(prev => ({ ...prev, [name]: value }))
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
 
    const { error } = await supabase.auth.signUp({
      email: fields.email,
      password: fields.password,
      options: {
        data: { full_name: fields.fullName.trim() },
      },
    })
 
    setLoading(false)
 
    if (error) {
      if (error.message.includes('already registered')) {
        setServerError('Este correo ya está registrado')
      } else {
        setServerError('Error al crear la cuenta. Intenta de nuevo.')
      }
      return
    }
 
    navigate('/')
  }
 
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
 
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Regístrate para hacer tu reserva
          </p>
        </div>
 
        {/* Formulario */}
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
 
            {serverError && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}
 
            {/* Nombre */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium">
                Nombre completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fields.fullName}
                onChange={handleChange}
                placeholder="Juan Pérez"
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors
                  focus:ring-2 focus:ring-ring
                  ${fieldErrors.fullName ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
              )}
            </div>
 
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
                autoComplete="new-password"
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
 
            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={fields.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors
                  focus:ring-2 focus:ring-ring
                  ${fieldErrors.confirmPassword ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>
 
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
 
          </form>
        </div>
 
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
 
      </div>
    </div>
  )
}