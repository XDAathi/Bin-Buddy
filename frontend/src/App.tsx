import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import LandingPage from './pages/LandingPage'
import ClassificationPage from './pages/ClassificationPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import TripsPage from './pages/TripsPage'
import AuthPage from './pages/AuthPage'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Authentication route */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Main application routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<LandingPage />} />
              <Route path="classify" element={<ClassificationPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="trips" element={<TripsPage />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App 