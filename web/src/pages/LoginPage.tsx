import { useEffect } from 'react'
import '../css/LoginPage.css'
import { useAuth } from '../providers/AuthProvider'
import { useNavigate } from 'react-router-dom'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.7 6.1 29.7 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 19-7.3 19-20 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.7 6.1 29.7 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 36 26.8 37 24 37c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.4 39.7 16.1 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.4 5.8-6.3 7.3l6.2 5.2C38.2 37.7 41 31.6 41 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

export default function LoginPage() {
  const { signInWithGoogle, loading, user, isAuthReady } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  return (
    <div className="login-hero" style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: 20 }}>
      <h1
        className="login-brand"
        style={{
          margin: 0,
          fontWeight: 600,
          letterSpacing: 0.5,
        }}
      >
        Boulder SP
      </h1>

      <div aria-busy={loading}>

        {!isAuthReady && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: '#1C1917',
            border: '1px solid #3F3F46',
            color: '#F59E0B',
            font: 'Segoe UI',
            marginBottom: 12
          }}>
            Authentication is not configured. Add your Firebase keys in `.env` to enable Google and Apple.
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <button
            className="google-login-btn liquid-glass-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            aria-label="Continue with Google"
          >
            <span className="icon"><GoogleIcon /></span>
            <span className="label">Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  )
}

