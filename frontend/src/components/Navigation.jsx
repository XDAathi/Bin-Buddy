import React, { useState } from 'react';
import { Recycle, Home, History, BarChart3, User, Moon, Sun, ChevronDown } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab, darkMode, setDarkMode, user, signOut }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: History },
    { id: 'footprint', label: 'FootPrint', icon: BarChart3 },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
              <div className="w-full px-4 sm:px-6 lg:px-8">
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
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-lg font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-eco text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:text-green-eco dark:hover:text-green-eco hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((open) => !open)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <User className="h-6 w-6" />
              <span className="hidden sm:block">{user?.email?.split('@')[0] || 'User'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50">
                {/* Switch for light/dark mode */}
                <div className="flex items-center w-full px-4 py-2">
                  <span className="text-sm text-gray-700 dark:text-gray-200 mr-2">
                    Light/Dark Mode
                  </span>
                  <label className="inline-flex relative items-center cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={() => setDarkMode(!darkMode)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-eco dark:bg-gray-700 rounded-full peer peer-checked:bg-green-eco transition-all duration-300"></div>
                    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow-md transform transition-transform duration-300 ${darkMode ? 'translate-x-5' : ''}`}></div>
                  </label>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setDropdownOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-100 dark:hover:bg-red-200"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;