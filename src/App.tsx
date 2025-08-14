import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import type React from 'react'
import { AuthProvider, useAuth } from './providers/AuthProvider'
import LoginPage from './pages/LoginPage'
import MarketPage from './pages/MarketPage'
import ProfilePage from './pages/ProfilePage'

const loginBgUrl = new URL('./assets/login_bg.PNG', import.meta.url).href

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return children
  if (user) return <Navigate to="/" replace />
  return children
}

function AppShell() {
  const { user } = useAuth()
  const location = useLocation()

  const isLoginRoute = location.pathname === '/login'
  const isLightRoute = location.pathname === '/' || location.pathname === '/profile'

  useEffect(() => {
    const root = document.documentElement
    if (isLightRoute) {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [isLightRoute])

  const userInitial = ((): string => {
    const name = (user?.displayName || user?.email || '') as string
    return name ? name.charAt(0).toUpperCase() : '•'
  })()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {!isLoginRoute && (
        <header className="app-header">
          <Link to="/" className="app-brand">Boulder SP</Link>
          <div className="header-right">
            {user ? (
              <Link to="/profile" aria-label="Profile">
                <button className="avatar-button">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="avatar-img" />
                  ) : (
                    <span className="avatar-fallback">{userInitial}</span>
                  )}
                </button>
              </Link>
            ) : (
              <Link to="/login" className="header-action" aria-label="Sign in">
                <span className="icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </header>
      )}
      <main
        style={{
          flex: 1,
          padding: isLoginRoute ? '0' : '1rem 0',
          display: isLoginRoute ? 'grid' : 'block',
          placeItems: isLoginRoute ? 'center' : undefined,
          // Ensure a solid black background under the image
          background: isLoginRoute ? `#000 url(${loginBgUrl}) center / cover no-repeat` : undefined
        }}
      >
        <Routes>
          <Route path="/" element={<MarketPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isLoginRoute && (
        <footer style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#374151' }}>
          <span>© {new Date().getFullYear()} Boulder SP</span>
        </footer>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
