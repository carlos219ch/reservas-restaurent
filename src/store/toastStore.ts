// src/store/toastStore.ts
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id:       string
  type:     ToastType
  title:    string
  message?: string
  duration: number
}

interface ToastStore {
  toasts: Toast[]
  push:   (toast: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = crypto.randomUUID()
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }))

    // Auto-remove after duration
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, toast.duration)
  },

  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// ----------------------------------------------------------------
// Helpers rápidos — úsalos en cualquier hook/componente
// ----------------------------------------------------------------
const { push } = useToastStore.getState()

export const toast = {
  success: (title: string, message?: string) =>
    push({ type: 'success', title, message, duration: 4000 }),
  error:   (title: string, message?: string) =>
    push({ type: 'error',   title, message, duration: 5000 }),
  info:    (title: string, message?: string) =>
    push({ type: 'info',    title, message, duration: 4000 }),
  warning: (title: string, message?: string) =>
    push({ type: 'warning', title, message, duration: 4500 }),
}
