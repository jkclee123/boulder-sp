import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { db } from '../firebase'
import '../css/ProfilePage.css'
import { collection, getDocs } from 'firebase/firestore'

interface Gym {
  id: string;
  name: string;
}

interface GymMembership {
  gymId: string;
  membershipId: string;
}

export default function ProfilePage(): React.ReactElement {
  const navigate = useNavigate()
  const { user, userProfile, signOut, updateProfile, refreshProfile } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    telegramId: ''
  })
  const [gyms, setGyms] = useState<Gym[]>([])
  const [gymMemberships, setGymMemberships] = useState<GymMembership[]>([])

  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchGyms = async () => {
      if (!db) return
      try {
        const gymsCollection = collection(db, 'gyms');
        const gymSnapshot = await getDocs(gymsCollection);
        const gymsList = gymSnapshot.docs.map(doc => ({
          id: doc.id,
          displayName: doc.data().displayName as string
        }));
        setGyms(gymsList);
      } catch (error) {
        console.error("Error fetching gyms:", error);
        setError('Could not load list of gyms.')
      }
    };

    fetchGyms();
  }, [])

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        phoneNumber: userProfile.phoneNumber || '',
        telegramId: userProfile.telegramId || ''
      })
      const memberships = userProfile.gymMemberId 
        ? Object.entries(userProfile.gymMemberId).map(([gymId, membershipId]) => ({ gymId, membershipId: membershipId as string }))
        : [];
      setGymMemberships(memberships);
    } else {
      setFormData({
        name: '',
        phoneNumber: '',
        telegramId: ''
      })
      setGymMemberships([]);
    }
  }, [userProfile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
    setSuccess(null)
  }

  const handleGymMembershipChange = (index: number, field: 'gymId' | 'membershipId', value: string) => {
    const newMemberships = [...gymMemberships];
    newMemberships[index][field] = value;
    setGymMemberships(newMemberships);
  };

  const handleAddMembershipRow = () => {
    setGymMemberships([...gymMemberships, { gymId: '', membershipId: '' }]);
  };

  const handleRemoveMembershipRow = (index: number) => {
    const newMemberships = gymMemberships.filter((_, i) => i !== index);
    setGymMemberships(newMemberships);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const gymMemberId = gymMemberships.reduce((acc, curr) => {
        if (curr.gymId && curr.membershipId) {
          acc[curr.gymId] = curr.membershipId;
        }
        return acc;
      }, {} as Record<string, string>);

      await updateProfile(formData.name, formData.phoneNumber || undefined, formData.telegramId || undefined, gymMemberId)
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
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
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        phoneNumber: userProfile.phoneNumber || '',
        telegramId: userProfile.telegramId || ''
      })
      const memberships = userProfile.gymMemberId 
        ? Object.entries(userProfile.gymMemberId).map(([gymId, membershipId]) => ({ gymId, membershipId: membershipId as string }))
        : [];
      setGymMemberships(memberships);
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

  const formatFirestoreTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Unknown'
    
    try {
      if (timestamp._seconds !== undefined && timestamp._nanoseconds !== undefined) {
        const date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      }
      else if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate()
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      else if (timestamp instanceof Date) {
        if (!isNaN(timestamp.getTime())) {
          return timestamp.toLocaleDateString()
        }
      }
      else if (typeof timestamp === 'number') {
        const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      else if (typeof timestamp === 'string') {
        const date = new Date(timestamp)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      
      console.warn('Invalid timestamp format:', timestamp)
      return 'Unknown'
    } catch (err) {
      console.error('Error formatting timestamp:', err, timestamp)
      return 'Unknown'
    }
  }

  const isProfileComplete = userProfile?.name && userProfile?.phoneNumber

  return (
    <div className="profile-page">
      <header className="profile-header">
        <h1>Account Profile</h1>
        {!isEditing && (
          <button 
            className="btn btn-edit" 
            onClick={() => setIsEditing(true)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        )}
      </header>

      <div className="profile-content">
        <div className="profile-card">
          <div className={`profile-status ${isProfileComplete ? 'complete' : 'incomplete'}`}>
            <div className="profile-status-header">
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
              <span>
                {isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
              </span>
            </div>
            <p>
              {isProfileComplete 
                ? 'Your profile is complete and you can access all features.'
                : 'Please provide your name and phone number to complete your profile.'
              }
            </p>
          </div>

          {success && (
            <div className="profile-alert success">
              {success}
            </div>
          )}

          {error && (
            <div className="profile-alert error">
              {error}
            </div>
          )}

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

            <div className="profile-form-group">
              <label className="profile-form-label">Gym Memberships</label>
              <div className="gym-memberships-list">
                {gymMemberships.map((membership, index) => (
                  <div key={index} className="gym-membership-row">
                    <select
                      name="gymId"
                      value={membership.gymId}
                      onChange={(e) => handleGymMembershipChange(index, 'gymId', e.target.value)}
                      disabled={!isEditing}
                      className="profile-form-input"
                    >
                      <option value="">Select a gym</option>
                      {gyms.map(gym => (
                        <option key={gym.id} value={gym.id}>{gym.displayName}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="membershipId"
                      placeholder="Membership ID"
                      value={membership.membershipId}
                      onChange={(e) => handleGymMembershipChange(index, 'membershipId', e.target.value)}
                      disabled={!isEditing}
                      className="profile-form-input"
                    />
                    {isEditing && (
                      <button type="button" onClick={() => handleRemoveMembershipRow(index)} className="btn-remove-membership">
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <button type="button" onClick={handleAddMembershipRow} className="btn-add-membership">
                    + Add Membership
                  </button>
                )}
                {!isEditing && gymMemberships.length === 0 && (
                    <p className="no-memberships-text">No gym memberships added yet.</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="profile-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-cancel"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-save"
                  disabled={isSubmitting || !formData.name.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="profile-card profile-info">
          <h3>Account Information</h3>
          <div className="profile-info-grid">
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
        
        <div className="logout-section">
          <button 
            className="btn btn-logout" 
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
