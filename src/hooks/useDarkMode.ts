// src/hooks/useDarkMode.ts
// Toggle dark mode con persistencia en localStorage.
// La clase .dark se añade/quita del elemento <html>.
// El CSS ya define todos los tokens dark en .dark { ... } (index.css).

import { useEffect, useState, useCallback } from 'react'

function getInitialDark(): boolean {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark')  return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => setIsDark(d => !d), [])

  return { isDark, toggle }
}
