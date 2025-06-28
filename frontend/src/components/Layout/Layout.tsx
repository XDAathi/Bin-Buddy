import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileMenu from './MobileMenu'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Don't show sidebar on landing page
  const isLandingPage = location.pathname === '/'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu */}
      <MobileMenu open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Desktop sidebar */}
      {!isLandingPage && (
        <Sidebar className="hidden lg:block" />
      )}

      {/* Main content */}
      <div className={`${!isLandingPage ? 'lg:pl-64' : ''}`}>
        {/* Top navigation */}
        <Navbar 
          onMenuClick={() => setSidebarOpen(true)} 
          showMenuButton={!isLandingPage}
        />

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
} 