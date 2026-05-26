// src/components/layout/ClientSidebar.tsx
//
// Sidebar izquierda en desktop + barra de navegación inferior en mobile.
// Usa la variable --primary para que el color sea global.

import { NavLink, Link } from 'react-router-dom'
import {
  Home, CalendarPlus, ClipboardList,
  UtensilsCrossed, LogOut, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'

const NAV_LINKS = [
  { to: '/',             label: 'Inicio',       icon: Home,          end: true  },
  { to: '/reservar',     label: 'Reservar',     icon: CalendarPlus,  end: false },
  { to: '/mis-reservas', label: 'Mis reservas', icon: ClipboardList, end: false },
] as const

export default function ClientSidebar() {
  const { profile, signOut } = useAuth()
  const { isDark, toggle }   = useDarkMode()

  const initials = profile?.full_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') ?? '?'

  return (
    <>
      {/* ════════════════════════════════════════
          DESKTOP: sidebar fija izquierda
      ════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col
                        border-r bg-background z-40">

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
          </div>
          <Link to="/" className="font-bold text-base hover:opacity-80 transition-opacity">
            Mesa Fácil
          </Link>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/20 dark:bg-primary/40 text-primary dark:text-amber-300'
                  : 'text-muted-foreground dark:text-zinc-300 hover:text-foreground hover:bg-muted',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer: avatar + acciones */}
        <div className="border-t px-3 py-4 space-y-1 shrink-0">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary
                            flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <p className="text-sm font-medium truncate flex-1 min-w-0">
              {profile?.full_name ?? '…'}
            </p>
          </div>

          {/* Modo oscuro */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                       text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>

          {/* Cerrar sesión */}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                       text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE: barra de navegación inferior
      ════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40
                      border-t bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => [
                'flex flex-col items-center justify-center gap-1',
                'px-5 py-2 rounded-xl transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <div className={[
                    'p-1.5 rounded-lg transition-colors',
                    isActive ? 'bg-primary/10' : '',
                  ].join(' ')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Perfil / User en mobile */}
          <div className="flex flex-col items-center justify-center gap-1 px-5 py-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary
                            flex items-center justify-center text-[10px] font-bold">
              {initials}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground leading-none">
              {profile?.full_name?.split(' ')[0] ?? 'Perfil'}
            </span>
          </div>
        </div>
      </nav>
    </>
  )
}
