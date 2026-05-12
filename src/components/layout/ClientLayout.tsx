import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function ClientLayout() {
  return (
    <div className="flex min-h-screen flex-col text-left">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
