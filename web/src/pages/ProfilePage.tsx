import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import '../css/ProfilePage.css';
import { collection, getDocs } from 'firebase/firestore';

// --- Helper Components ---

const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const StatusBanner = ({ type, message }: { type: 'success' | 'error' | 'warning', message: string }) => (
  <div className={`status-banner ${type}`}>
    <span className="status-icon">
      {type === 'success' && '✓'}
      {type === 'error' && '✗'}
      {type === 'warning' && '!'}
    </span>
    <p>{message}</p>
  </div>
);

const ProfileCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`profile-card ${className || ''}`}>{children}</div>
);

const ProfileCardHeader = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="profile-card-header">
    <h2>{title}</h2>
    <div>{children}</div>
  </div>
);

const ProfileCardBody = ({ children }: { children: React.ReactNode }) => (
  <div className="profile-card-body">{children}</div>
);

const ProfileCardFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="profile-card-footer">{children}</div>
);

const FormGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

// --- Main Components ---

interface ProfileFormCardProps {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

const ProfileFormCard = ({ isEditing, setIsEditing }: ProfileFormCardProps) => {
  const { user, userProfile, updateProfile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({ name: '', phoneNumber: '', telegramId: '' });
  const [gymMemberships, setGymMemberships] = useState<{ gymId: string; membershipId: string }[]>([]);
  const [gyms, setGyms] = useState<{ id: string; displayName: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchGyms = async () => {
      if (!db) return;
      try {
        const gymsCollection = collection(db, 'gyms');
        const gymSnapshot = await getDocs(gymsCollection);
        const gymsList = gymSnapshot.docs.map(doc => ({ id: doc.data().id as string, displayName: doc.data().displayName as string }));
        setGyms(gymsList);
      } catch (err) {
        setError('Could not load list of gyms.');
      }
    };
    fetchGyms();
  }, []);

  const resetForm = (profile: any) => {
    setFormData({
      name: profile?.name || '',
      phoneNumber: profile?.phoneNumber || '',
      telegramId: profile?.telegramId || '',
    });
    const memberships = profile?.gymMemberId
      ? Object.entries(profile.gymMemberId).map(([gymId, membershipId]) => ({ gymId, membershipId: membershipId as string }))
      : [];
    setGymMemberships(memberships);
  };

  useEffect(() => {
    resetForm(userProfile);
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMembershipChange = (index: number, field: 'gymId' | 'membershipId', value: string) => {
    const newMemberships = [...gymMemberships];
    newMemberships[index][field] = value;
    setGymMemberships(newMemberships);
  };

  const addMembershipRow = () => setGymMemberships([...gymMemberships, { gymId: '', membershipId: '' }]);
  const removeMembershipRow = (index: number) => setGymMemberships(gymMemberships.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // Validate phone number is exactly 8 digits
    if (formData.phoneNumber && (!/^\d{8}$/.test(formData.phoneNumber))) {
      alert('Phone number must be exactly 8 digits.');
      setIsSubmitting(false);
      return;
    }

    try {
      const gymMemberId = gymMemberships.reduce((acc, curr) => {
        if (curr.gymId && curr.membershipId) acc[curr.gymId] = curr.membershipId;
        return acc;
      }, {} as Record<string, string>);

      await updateProfile(formData.name, formData.phoneNumber, formData.telegramId, gymMemberId);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm(userProfile);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const isProfileComplete = useMemo(() => !!userProfile?.name, [userProfile]);

  return (
    <ProfileCard className="main-content-card">
      <form onSubmit={handleSubmit}>
        <ProfileCardHeader title="Profile">
          {!isEditing && (
            <button type="button" className="btn btn-secondary btn-icon" onClick={() => setIsEditing(true)} aria-label="Edit profile">
              <EditIcon />
            </button>
          )}
        </ProfileCardHeader>
        <ProfileCardBody>
          {!isProfileComplete && (
            <StatusBanner type="warning" message="Please provide your name to complete your profile." />
          )}
          {success && <StatusBanner type="success" message={success} />}
          {error && <StatusBanner type="error" message={error} />}

          <FormGroup label="Email">
            <input type="email" value={user?.email || ''} disabled className="form-input" />
          </FormGroup>
          <FormGroup label="Nickname *">
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={!isEditing} required className="form-input" />
          </FormGroup>
          <FormGroup label="Phone Number">
            <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} disabled={!isEditing} className="form-input" />
          </FormGroup>
          <FormGroup label="Telegram Username">
            <input type="text" name="telegramId" value={formData.telegramId} onChange={handleInputChange} disabled={!isEditing} className="form-input" />
          </FormGroup>

          <FormGroup label="Gym Memberships">
            <div className="membership-list">
              {gymMemberships.map((mem, i) => (
                <div key={i} className="membership-item">
                  <select value={mem.gymId} onChange={e => handleMembershipChange(i, 'gymId', e.target.value)} disabled={!isEditing} className="form-input">
                    <option value="">Select Gym</option>
                    {gyms.map(g => <option key={g.id} value={g.id}>{g.displayName}</option>)}
                  </select>
                  <input type="text" placeholder="Member ID" value={mem.membershipId} onChange={e => handleMembershipChange(i, 'membershipId', e.target.value)} disabled={!isEditing} className="form-input" />
                  {isEditing && <button type="button" onClick={() => removeMembershipRow(i)} className="btn-icon">&times;</button>}
                </div>
              ))}
              {isEditing && <button type="button" onClick={addMembershipRow} className="btn-add-membership">+ Add Membership</button>}
              {!isEditing && gymMemberships.length === 0 && <p className="no-memberships-text">No gym memberships added.</p>}
            </div>
          </FormGroup>
        </ProfileCardBody>
        {isEditing && (
          <ProfileCardFooter>
            <button type="button" onClick={handleCancel} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formData.name.trim()}> {isSubmitting ? 'Saving...' : 'Save Changes'}</button>
          </ProfileCardFooter>
        )}
      </form>
    </ProfileCard>
  );
};

// --- Main Page Component ---

export default function ProfilePage(): React.ReactElement {
  const { refreshProfile, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!loading) {
      refreshProfile();
    }
  }, [refreshProfile, loading]);

  return (
    <div className="profile-page">
      <main>
        <ProfileFormCard isEditing={isEditing} setIsEditing={setIsEditing} />
      </main>
    </div>
  );
}
