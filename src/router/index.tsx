import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// ── Páginas públicas ──────────────────────────────────────────────
const DiscoveryPage           = lazy(() => import('@/pages/public/DiscoveryPage'))
const RestaurantProfilePage   = lazy(() => import('@/pages/public/RestaurantProfilePage'))
const JoinPage                = lazy(() => import('@/pages/public/JoinPage'))

// ── Auth ─────────────────────────────────────────────────────────
const LoginForm               = lazy(() => import('@/components/auth/LoginForm'))
const RegisterForm            = lazy(() => import('@/components/auth/RegisterForm'))

// ── Layouts ──────────────────────────────────────────────────────
const ClientNavLayout         = lazy(() => import('@/components/layout/ClientNavLayout'))
const AdminLayout             = lazy(() => import('@/components/layout/AdminLayout'))

// ── Páginas del cliente ──────────────────────────────────────────
const ReservePage             = lazy(() => import('@/pages/client/ReservePage'))
const MyReservationsPage      = lazy(() => import('@/pages/client/MyReservationsPage'))

// ── Páginas del admin ────────────────────────────────────────────
const DashboardPage     = lazy(() => import('@/pages/admin/DashboardPage'))
const CalendarPage      = lazy(() => import('@/pages/admin/CalendarPage'))
const ReservationsPage  = lazy(() => import('@/pages/admin/ReservationsPage'))
const WaitlistPage      = lazy(() => import('@/pages/admin/WaitlistPage'))
const SettingsPage      = lazy(() => import('@/pages/admin/SettingsPage'))
const ReportsPage       = lazy(() => import('@/pages/admin/ReportsPage'))
const ClientsPage       = lazy(() => import('@/pages/admin/ClientsPage'))
const MenuPage          = lazy(() => import('@/pages/admin/MenuPage'))
const ApprovalsPage     = lazy(() => import('@/pages/admin/ApprovalsPage'))

// -----------------------------------------------------------------
// Loader y guardias
// -----------------------------------------------------------------
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading)              return <PageLoader />
  if (!isAuthenticated)     return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

// Redirige si ya está autenticado (honra ?redirect)
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')

  if (loading) return <PageLoader />
  if (isAuthenticated) {
    if (redirect) return <Navigate to={decodeURIComponent(redirect)} replace />
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />
  }
  return <>{children}</>
}

// -----------------------------------------------------------------
// Router
// -----------------------------------------------------------------
export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Home inteligente (público + personalizado si logueado) ── */}
          <Route path="/" element={<DiscoveryPage />} />

          {/* ── Perfiles públicos de restaurante ── */}
          <Route path="/restaurante/:id"          element={<RestaurantProfilePage />} />
          <Route path="/unirse"                   element={<JoinPage />} />

          {/* ── Auth ── */}
          <Route path="/login"    element={<PublicOnlyRoute><LoginForm /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterForm /></PublicOnlyRoute>} />

          {/* ── Rutas del cliente (navbar superior, sin sidebar) ── */}
          <Route element={<ProtectedRoute><ClientNavLayout /></ProtectedRoute>}>
            <Route path="/reservar"                 element={<ReservePage />} />
            <Route path="/mis-reservas"             element={<MyReservationsPage />} />
            <Route path="/restaurante/:id/reservar" element={<ReservePage />} />
          </Route>

          {/* ── Admin ── */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
            <Route index             element={<DashboardPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="reservas"   element={<ReservationsPage />} />
            <Route path="lista-espera" element={<WaitlistPage />} />
            <Route path="clientes"   element={<ClientsPage />} />
            <Route path="carta"      element={<MenuPage />} />
            <Route path="reportes"      element={<ReportsPage />} />
            <Route path="ajustes"       element={<SettingsPage />} />
            <Route path="aprobaciones"  element={<ApprovalsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
