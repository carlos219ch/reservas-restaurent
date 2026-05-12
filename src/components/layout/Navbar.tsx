import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, UtensilsCrossed, LogOut, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const navLinks = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/reservar', label: 'Reservar', end: false },
  { to: '/mis-reservas', label: 'Mis reservas', end: false },
] as const

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity"
        >
          <UtensilsCrossed className="h-5 w-5" />
          <span>Mesa Fácil</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `text-sm transition-colors hover:text-foreground ${
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Desktop user menu */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
          {navLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          <div className="border-t pt-3 mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{profile?.full_name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
