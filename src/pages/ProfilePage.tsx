import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

export default function ProfilePage(): React.ReactElement {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <section className="filter" style={{ display: 'grid', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Profile</h1>
        <p className="chat-subtitle" style={{ marginTop: 6 }}>Signed in as {user?.displayName || user?.email || 'Unknown user'}</p>
        <div>
          <button className="btn" onClick={handleLogout}>Log out</button>
        </div>
      </section>
    </div>
  )
}


