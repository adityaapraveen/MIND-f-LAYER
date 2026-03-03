import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import SharedView from './components/SharedView'
import './App.css'

function AppContent() {
  const [token, setToken] = useState(() => localStorage.getItem('sb_token'))
  const [userId, setUserId] = useState(() => localStorage.getItem('sb_userId'))
  const [username, setUsername] = useState(() => localStorage.getItem('sb_username') || '')

  const handleLogin = (newToken, newUserId, newUsername) => {
    setToken(newToken)
    setUserId(newUserId)
    setUsername(newUsername)
    localStorage.setItem('sb_token', newToken)
    localStorage.setItem('sb_userId', String(newUserId))
    localStorage.setItem('sb_username', newUsername)
  }

  const handleLogout = () => {
    setToken(null)
    setUserId(null)
    setUsername('')
    localStorage.removeItem('sb_token')
    localStorage.removeItem('sb_userId')
    localStorage.removeItem('sb_username')
  }

  return (
    <Routes>
      {/* 🏡 Home / Dashboard Route */}
      <Route
        path="/"
        element={
          token ? (
            <div className="app">
              <Dashboard
                token={token}
                userId={userId}
                username={username}
                onLogout={handleLogout}
              />
            </div>
          ) : (
            <div className="app">
              <AuthPage onLogin={handleLogin} />
            </div>
          )
        }
      />

      {/* 🧠 Share Route (Public) */}
      <Route path="/share/:hash" element={<SharedView />} />

      {/* 🔄 Fallback to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
