import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import type React from 'react'
import { AuthProvider, useAuth } from './providers/AuthProvider'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

const loginBgUrl = new URL('./assets/login_bg.PNG', import.meta.url).href

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {!isLoginRoute && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <Link to="/" style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827', textDecoration: 'none' }}>Boulder SP</Link>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user ? (
              <button onClick={signOut}>Sign out</button>
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
          backgroundColor: isLoginRoute ? '#000' : undefined,
          backgroundImage: isLoginRoute ? `url(${loginBgUrl})` : undefined,
          backgroundSize: isLoginRoute ? 'cover' : undefined,
          backgroundPosition: isLoginRoute ? 'center' : undefined,
          backgroundRepeat: isLoginRoute ? 'no-repeat' : undefined
        }}
      >
        <Routes>
          <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
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
