import { Outlet } from 'react-router-dom'
import AppNavbar from './AppNavbar'
import ChatFAB from '@/components/chat/ChatFAB'

export default function ClientNavLayout() {
  return (
    <div className="min-h-screen bg-[#F7F8F6] dark:bg-background">
      <AppNavbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Outlet />
      </main>
      <ChatFAB />
    </div>
  )
}
