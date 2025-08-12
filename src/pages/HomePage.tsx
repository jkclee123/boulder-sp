import { useAuth } from '../providers/AuthProvider'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <h1>Home</h1>
      {user ? (
        <div className="card">
          <p style={{ marginBottom: '0.5rem' }}>Signed in as:</p>
          <strong>{user.displayName || user.email || user.uid}</strong>
        </div>
      ) : (
        <div className="card">
          <p>You are not signed in. Use the Login button in the header.</p>
        </div>
      )}
    </div>
  )
}


