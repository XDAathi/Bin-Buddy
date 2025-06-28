import React from 'react';
import { Recycle, Home, History, BarChart3, User, Moon, Sun } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab, darkMode, setDarkMode, user, signOut }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: History },
    { id: 'footprint', label: 'FootPrint', icon: BarChart3 },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Recycle className="h-8 w-8 text-green-eco" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Bin Buddy
            </span>
          </div>

          {/* Navigation tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-eco text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-green-eco dark:hover:text-green-eco'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
              </div>
              <button
                onClick={signOut}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 