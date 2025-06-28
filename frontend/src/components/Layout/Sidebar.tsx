import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Camera, 
  BarChart3, 
  History, 
  MapPin, 
  Leaf,
  Settings
} from 'lucide-react'
import { cn } from '../../utils/cn'

interface SidebarProps {
  className?: string
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Classify Item', href: '/classify', icon: Camera },
  { name: 'My Trips', href: '/trips', icon: MapPin },
  { name: 'History', href: '/history', icon: History },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

export default function Sidebar({ className }: SidebarProps) {
  const location = useLocation()

  return (
    <div className={cn("fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700", className)}>
      <div className="flex flex-col h-full">
        {/* Logo area */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-eco rounded-lg flex items-center justify-center">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient-eco">BinBuddy</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            to="/settings"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </Link>
        </div>
      </div>
    </div>
  )
} 