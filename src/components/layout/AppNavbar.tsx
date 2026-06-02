import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed, CalendarPlus, ClipboardList,
  Sun, Moon, LogOut, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useRestaurantContextStore } from '@/store/restaurantContextStore'

export default function AppNavbar() {
  const { profile, isAuthenticated, signOut } = useAuth()
  const { isDark, toggle: toggleDark }        = useDarkMode()
  const { activeRestaurantId }                = useRestaurantContextStore()
  const navigate                              = useNavigate()
  const [dropdownOpen, setDropdownOpen]       = useState(false)
  const dropdownRef                           = useRef<HTMLDivElement>(null)

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const initials  = profile?.full_name
    ?.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') ?? '?'

  // Si hay restaurante activo en contexto → reservar ahí directamente
  // Si no → ir a discovery para que elija uno
  const reserveHref = activeRestaurantId ? `/restaurante/${activeRestaurantId}/reservar` : '/'

  function handleReserve(e: React.MouseEvent) {
    if (!activeRestaurantId) {
      e.preventDefault()
      navigate('/')
      setTimeout(() => document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-6">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary shrink-0">
          <UtensilsCrossed className="h-5 w-5" />
          MesaFácil
        </Link>

        {/* ── Derecha ── */}
        <div className="flex items-center gap-2">

          {/* Sin sesión */}
          {!isAuthenticated && (
            <>
              <Link to="/unirse"
                className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors px-2">
                ¿Tenés un restaurante?
              </Link>
              <Link to="/login"
                className="px-4 py-1.5 rounded-full border text-sm font-medium transition-colors
                           hover:bg-primary hover:text-primary-foreground hover:border-primary">
                Iniciar sesión
              </Link>
              <Link to="/register"
                className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium
                           hover:opacity-90 transition-opacity">
                Registrarse
              </Link>
            </>
          )}

          {/* Con sesión */}
          {isAuthenticated && (
            <>
              {/* Acceso directo: Nueva reserva (contextual) */}
              <Link
                to={reserveHref}
                onClick={handleReserve}
                className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium
                           transition-colors border hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <CalendarPlus className="h-4 w-4" />
                Nueva reserva
              </Link>

              {/* Acceso directo: Mis reservas */}
              <NavLink to="/mis-reservas"
                className={({ isActive }) => [
                  'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}>
                <ClipboardList className="h-4 w-4" />
                Mis reservas
              </NavLink>

              {/* Avatar + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full
                             border hover:border-primary/30 hover:bg-muted transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground
                                  flex items-center justify-center text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{firstName}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200
                    ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border bg-card shadow-lg
                                  overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                    {/* Cabecera del dropdown */}
                    <div className="px-4 py-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground
                                        flex items-center justify-center text-sm font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="p-1.5">
                      <Link
                        to="/mis-reservas"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                                   hover:bg-muted transition-colors"
                      >
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        Mis reservas
                      </Link>
                      <Link
                        to={reserveHref}
                        onClick={(e) => { setDropdownOpen(false); handleReserve(e) }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                                   hover:bg-muted transition-colors"
                      >
                        <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                        Nueva reserva
                      </Link>
                    </div>

                    <div className="border-t p-1.5 space-y-0.5">
                      <button
                        onClick={() => { toggleDark(); setDropdownOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                                   text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {isDark ? 'Modo claro' : 'Modo oscuro'}
                      </button>
                      <button
                        onClick={() => { signOut(); setDropdownOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                                   text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
