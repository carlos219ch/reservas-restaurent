import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  Settings,
  UtensilsCrossed,
  LogOut,
  Menu,
  X,
  BarChart2,
  UsersRound,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useRealtimeReservations } from '@/hooks/useRealtimeReservations'
import { Button } from '@/components/ui/button'

const adminNavLinks = [
  { to: '/admin',               label: 'Dashboard',       icon: LayoutDashboard, end: true  },
  { to: '/admin/calendario',    label: 'Calendario',      icon: CalendarDays,    end: false },
  { to: '/admin/reservas',      label: 'Reservas',        icon: ClipboardList,   end: false },
  { to: '/admin/lista-espera',  label: 'Lista de espera', icon: Users,           end: false },
  { to: '/admin/clientes',      label: 'Clientes',        icon: UsersRound,      end: false },
  { to: '/admin/reportes',      label: 'Reportes',        icon: BarChart2,       end: false },
  { to: '/admin/ajustes',       label: 'Ajustes',         icon: Settings,        end: false },
] as const

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const { isDark, toggle: toggleDark } = useDarkMode()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useRealtimeReservations()   // ← suscripción global mientras el admin está activo

  const initials = profile?.full_name?.[0]?.toUpperCase() ?? 'A'

  return (
    <div className="flex min-h-screen text-left">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r bg-sidebar
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link
            to="/admin"
            className="flex items-center gap-2 font-semibold text-sidebar-foreground hover:opacity-80 transition-opacity"
          >
            <UtensilsCrossed className="h-5 w-5" />
            <span>Mesa Fácil</span>
          </Link>
          <button
            className="md:hidden p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {adminNavLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t p-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-sidebar-foreground/60">Administrador</p>
            </div>
          </div>
          <button
            onClick={toggleDark}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
          <button
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">Panel Admin</span>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
