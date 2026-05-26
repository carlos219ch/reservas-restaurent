import { Outlet } from 'react-router-dom'
import ClientSidebar from './ClientSidebar'
import ChatFAB from '@/components/chat/ChatFAB'

export default function ClientLayout() {
  return (
    <div className="flex min-h-screen bg-background">

      {/* Sidebar / bottom nav */}
      <ClientSidebar />

      {/* Contenido principal
          md:ml-64  → deja espacio al sidebar en desktop
          pb-16     → deja espacio a la bottom-nav en mobile  */}
      <main className="flex-1 min-w-0 md:ml-64 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* FAB de IA — en mobile sube sobre la bottom-nav */}
      <ChatFAB />
    </div>
  )
}
