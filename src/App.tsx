import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { AuthProvider, useAuth } from './providers/AuthProvider'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

const loginBgUrl = new URL('./assets/login_bg.PNG', import.meta.url).href

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return children
  if (user) return <Navigate to="/" replace />
  return children
}

function AppShell() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const isLoginRoute = location.pathname === '/login'

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMenuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('click', onClickOutside)
    return () => window.removeEventListener('click', onClickOutside)
  }, [isMenuOpen])

  const userInitial = ((): string => {
    const name = (user?.displayName || user?.email || '') as string
    return name ? name.charAt(0).toUpperCase() : '•'
  })()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {!isLoginRoute && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <Link to="/" style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827', textDecoration: 'none' }}>Boulder SP</Link>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user ? (
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  className="avatar-button"
                  onClick={() => setIsMenuOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label="Open profile menu"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="avatar-img" />
                  ) : (
                    <span className="avatar-fallback">{userInitial}</span>
                  )}
                </button>
                {isMenuOpen && (
                  <div className="avatar-menu" role="menu">
                    <div className="avatar-menu-header" role="none">
                      <strong style={{ display: 'block' }}>{user.displayName || 'Signed in'}</strong>
                      <span style={{ color: '#6B7280', fontSize: 12 }}>{user.email}</span>
                    </div>
                    <button className="avatar-menu-item" role="menuitem" onClick={() => setIsMenuOpen(false)}>
                      My Profile
                    </button>
                    <button className="avatar-menu-item" role="menuitem" onClick={signOut}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"><button>Login</button></Link>
            )}
          </div>
        </header>
      )}
      <main
        style={{
          flex: 1,
          padding: isLoginRoute ? '0' : '2rem',
          display: isLoginRoute ? 'grid' : 'block',
          placeItems: isLoginRoute ? 'center' : undefined,
          // Ensure a solid black background under the image
          background: isLoginRoute ? `#000 url(${loginBgUrl}) center / cover no-repeat` : undefined
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
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
