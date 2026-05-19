// src/router/index.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// Lazy loading de páginas para mejor performance
const LoginForm      = lazy(() => import('@/components/auth/LoginForm'))
const RegisterForm   = lazy(() => import('@/components/auth/RegisterForm'))
const ClientLayout   = lazy(() => import('@/components/layout/ClientLayout'))
const AdminLayout    = lazy(() => import('@/components/layout/AdminLayout'))
const HomePage       = lazy(() => import('@/pages/client/HomePage'))
const ReservePage    = lazy(() => import('@/pages/client/ReservePage'))
const MyReservationsPage = lazy(() => import('@/pages/client/MyReservationsPage'))
const DashboardPage      = lazy(() => import('@/pages/admin/DashboardPage'))
const CalendarPage       = lazy(() => import('@/pages/admin/CalendarPage'))
const ReservationsPage   = lazy(() => import('@/pages/admin/ReservationsPage'))
const WaitlistPage       = lazy(() => import('@/pages/admin/WaitlistPage'))
const SettingsPage       = lazy(() => import('@/pages/admin/SettingsPage'))

// -----------------------------------------------------------------
// Componentes de carga y guardias de ruta
// -----------------------------------------------------------------

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />

  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) return <PageLoader />

  // Si ya está autenticado, redirige según su rol
  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />
  }

  return <>{children}</>
}

// -----------------------------------------------------------------
// Router principal
// -----------------------------------------------------------------

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* Rutas públicas — solo accesibles sin sesión */}
          <Route
            path="/login"
            element={<PublicOnlyRoute><LoginForm /></PublicOnlyRoute>}
          />
          <Route
            path="/register"
            element={<PublicOnlyRoute><RegisterForm /></PublicOnlyRoute>}
          />

          {/* Rutas del cliente */}
          <Route
            path="/"
            element={<ProtectedRoute><ClientLayout /></ProtectedRoute>}
          >
            <Route index element={<HomePage />} />
            <Route path="reservar" element={<ReservePage />} />
            <Route path="mis-reservas" element={<MyReservationsPage />} />
          </Route>

          {/* Rutas del admin */}
          <Route
            path="/admin"
            element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<DashboardPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="reservas"      element={<ReservationsPage />} />
            <Route path="lista-espera" element={<WaitlistPage />} />
            <Route path="ajustes"      element={<SettingsPage />} />
          </Route>

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
