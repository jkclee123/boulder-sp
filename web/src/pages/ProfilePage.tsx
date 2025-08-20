import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { functions } from '../firebase'
import '../css/ProfilePage.css'

export default function ProfilePage(): React.ReactElement {
  const navigate = useNavigate()
  const { user, userProfile, signOut, updateProfile, refreshProfile } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    telegramId: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        phoneNumber: userProfile.phoneNumber || '',
        telegramId: userProfile.telegramId || ''
      })
    } else {
      setFormData({
        name: '',
        phoneNumber: '',
        telegramId: ''
      })
    }
  }, [userProfile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear any previous error/success messages when user starts typing
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      
      await updateProfile(formData.name, formData.phoneNumber || undefined, formData.telegramId || undefined)
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      // Refresh profile to get updated data
      await refreshProfile()
    } catch (err) {
      console.error('Profile update error:', err)
      console.error('Profile update error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : 'No stack trace',
        code: (err as any)?.code || 'No code',
        details: (err as any)?.details || 'No details'
      })
      
      let errorMessage = 'Failed to update profile'
      
      if (err instanceof Error) {
        // Handle specific Firebase function errors
        if (err.message.includes('permission-denied')) {
          errorMessage = 'You do not have permission to update your profile'
        } else if (err.message.includes('not-found')) {
          errorMessage = 'User profile not found. Please try logging out and back in.'
        } else if (err.message.includes('unavailable')) {
          errorMessage = 'Service temporarily unavailable. Please try again.'
        } else if (err.message.includes('internal')) {
          errorMessage = 'An internal error occurred. Please try again or contact support.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Reset form to current profile data
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        phoneNumber: userProfile.phoneNumber || '',
        telegramId: userProfile.telegramId || ''
      })
    }
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  // Helper function to safely convert Firestore timestamp to Date
  const formatFirestoreTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Unknown'
    
    try {
      // Handle serialized Timestamp from Callable Functions (e.g., { _seconds: ..., _nanoseconds: ... })
      if (timestamp._seconds !== undefined && timestamp._nanoseconds !== undefined) {
        const date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      }
      // Handle Firestore Timestamp objects (they have seconds and nanoseconds)
      else if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      // Handle Firestore Timestamp with toDate method
      else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate()
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      // Handle regular Date objects
      else if (timestamp instanceof Date) {
        if (!isNaN(timestamp.getTime())) {
          return timestamp.toLocaleDateString()
        }
      }
      // Handle Unix timestamps (seconds or milliseconds)
      else if (typeof timestamp === 'number') {
        const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      // Handle ISO string timestamps
      else if (typeof timestamp === 'string') {
        const date = new Date(timestamp)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      
      // If we get here, the timestamp is invalid
      console.warn('Invalid timestamp format:', timestamp)
      return 'Unknown'
    } catch (err) {
      console.error('Error formatting timestamp:', err, timestamp)
      return 'Unknown'
    }
  }

  const isProfileComplete = userProfile?.name && userProfile?.phoneNumber

  return (
    <div className="container" style={{ display: 'grid', gap: 16 }}>
      <section className="filter" style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Account Profile</h1>
          {!isEditing && (
            <button 
              className="btn" 
              onClick={() => setIsEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}
        </div>

        {/* Profile Completion Status */}
        <div className={`profile-status ${isProfileComplete ? 'complete' : 'incomplete'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isProfileComplete ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            )}
            <span style={{ fontWeight: 600 }}>
              {isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
            {isProfileComplete 
              ? 'Your profile is complete and you can access all features.'
              : 'Please provide your name and phone number to complete your profile.'
            }
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="profile-status complete">
            {success}
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626'
          }}>
            {error}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-form-group">
            <label htmlFor="name" className="profile-form-label">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={!isEditing}
              required
              className="profile-form-input"
              placeholder="Enter your name"
            />
          </div>

          <div className="profile-form-group">
            <label htmlFor="phoneNumber" className="profile-form-label">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              disabled={!isEditing}
              required
              className="profile-form-input"
              placeholder="Enter your phone number"
            />
          </div>

          <div className="profile-form-group">
            <label htmlFor="telegramId" className="profile-form-label">
              Telegram Username
            </label>
            <input
              type="text"
              id="telegramId"
              name="telegramId"
              value={formData.telegramId}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="profile-form-input"
              placeholder="Enter your Telegram username"
            />
          </div>

          {/* Edit Mode Actions */}
          {isEditing && (
            <div className="profile-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn"
                disabled={isSubmitting}
                style={{ background: '#f3f4f6', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={isSubmitting || !formData.name.trim()}
                style={{ 
                  background: '#3b82f6', 
                  color: '#fff',
                  borderColor: '#3b82f6'
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>

        {/* Account Information */}
        <div className="profile-info">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
            Account Information
          </h3>
          <div style={{ display: 'grid', gap: 8, fontSize: '14px' }}>
            <div className="profile-info-row">
              <span className="profile-info-label">Email:</span>
              <span className="profile-info-value">{user?.email || 'Not provided'}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Account Created:</span>
              <span className="profile-info-value">
                {formatFirestoreTimestamp(userProfile?.createdAt)}
              </span>
            </div>
            {userProfile?.updatedAt && (
              <div className="profile-info-row">
                <span className="profile-info-label">Last Updated:</span>
                <span className="profile-info-value">
                  {formatFirestoreTimestamp(userProfile.updatedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            className="btn" 
            onClick={handleLogout}
            style={{ 
              background: '#ef4444', 
              color: '#fff',
              borderColor: '#ef4444',
              padding: '8px 24px'
            }}
          >
            Sign Out
          </button>
        </div>
      </section>
    </div>
  )
}


