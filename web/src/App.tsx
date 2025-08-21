import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import type React from 'react'
import { AuthProvider, useAuth } from './providers/AuthProvider'
import LoginPage from './pages/LoginPage'
import MarketPage from './pages/MarketPage'
import ProfilePage from './pages/ProfilePage'
import MyPassPage from './pages/MyPassPage'
import PassLogPage from './pages/PassLogPage'
import AdminPage from './pages/AdminPage'

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return children
  if (user) return <Navigate to="/" replace />
  return children
}

function AppShell() {
  const { user, signOut, userProfile } = useAuth()
  const location = useLocation()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const isLoginRoute = location.pathname === '/login'
  const isLightRoute = !isLoginRoute

  useEffect(() => {
    const root = document.documentElement
    if (isLightRoute) {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [isLightRoute])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef])

  const userInitial = ((): string => {
    const name = (user?.displayName || user?.email || '') as string
    return name ? name.charAt(0).toUpperCase() : '•'
  })()

  const handleSignOut = async () => {
    await signOut()
    setIsProfileMenuOpen(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {!isLoginRoute && (
        <header className="app-header">
          <Link to="/" className="app-brand">Boulder SP</Link>
          <div className="header-right">
            {user ? (
              <div className="profile-menu-container" ref={profileMenuRef}>
                <button className="avatar-button" onClick={() => setIsProfileMenuOpen(prev => !prev)} aria-label="Profile menu">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="avatar-img" />
                  ) : (
                    <span className="avatar-fallback">{userInitial}</span>
                  )}
                </button>
                {isProfileMenuOpen && (
                  <div className="profile-menu">
                    <Link to="/profile" className="profile-menu-item" onClick={() => setIsProfileMenuOpen(false)}>Profile</Link>
                    <Link to="/mypass" className="profile-menu-item" onClick={() => setIsProfileMenuOpen(false)}>My Pass</Link>
                    <Link to="/pass-log" className="profile-menu-item" onClick={() => setIsProfileMenuOpen(false)}>Pass Records</Link>
                    {userProfile?.isAdmin && (
                      <Link to="/admin" className="profile-menu-item" onClick={() => setIsProfileMenuOpen(false)}>Admin Portal</Link>
                    )}
                    <button onClick={handleSignOut} className="profile-menu-item danger">Sign Out</button>
                  </div>
                )}
              </div>
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
          // Solid base background; actual image handled by LoginPage pseudo-element
          background: isLoginRoute ? '#000' : undefined
        }}
      >
        <Routes>
          <Route path="/" element={<MarketPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/mypass" element={<MyPassPage />} />
          <Route path="/pass-log" element={<PassLogPage />} />
          <Route path="/admin" element={<AdminPage />} />
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
