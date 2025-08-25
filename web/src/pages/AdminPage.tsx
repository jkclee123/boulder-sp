import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db, functions } from '../firebase';
import { collection, query, where, onSnapshot, Timestamp, getDocs, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

interface AdminPass {
  id: string;
  gymDisplayName: string;
  gymId: string;
  passName: string;
  count: number;
  price: number;
  duration: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface User {
  id: string;
  name: string;
  phoneNumber: string;
  gymMemberId?: { [gymId: string]: string };
}

const TransferAdminPassModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  pass: AdminPass | null;
  adminGym: string;
  onSuccess: () => void;
}> = ({ isOpen, onClose, pass, adminGym, onSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'memberId'>('phone');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchRecipient = async () => {
    if (!searchTerm.trim() || !db) return;

    setSearchLoading(true);
    try {
      let queryField: string;
      let queryValue: string;

      if (searchType === 'phone') {
        queryField = 'phoneNumber';
        queryValue = searchTerm.trim();
      } else {
        queryField = `gymMemberId.${adminGym}`;
        queryValue = searchTerm.trim();
      }

      const usersQuery = query(collection(db, 'users'), where(queryField, '==', queryValue));
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        alert('No user found with that search criteria.');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      setRecipient({
        id: userDoc.id,
        name: userData.name || 'Unknown',
        phoneNumber: userData.phoneNumber || '',
        gymMemberId: userData.gymMemberId || {}
      });
    } catch (error: any) {
      console.error('Error searching for user:', error);
      alert(`Error searching for user: ${error.message || 'Unknown error'}`);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!recipient || !pass || !functions) return;

    // For admin passes, use the full count and admin pass price
    const finalCount = pass.count;
    const finalPrice = pass.price;

    setLoading(true);
    try {
      const transferAdminPassFunction = httpsCallable(functions, 'transferAdminPass');
      await transferAdminPassFunction({
        adminPassId: pass.id,
        recipientUserId: recipient.id,
        count: finalCount,
        price: finalPrice
      });

      alert(`Successfully transferred ${finalCount} pass(es) to ${recipient.name}!`);
      onSuccess();
      onClose();
      // Reset form
      setSearchTerm('');
      setRecipient(null);
    } catch (error: any) {
      console.error('Error transferring admin pass:', error);
      alert(`Failed to transfer admin pass: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pass) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Transfer Admin Pass</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          <div className="pass-info">
            <p><strong>Pass:</strong> {pass.gymDisplayName}</p>
            <p><strong>Available Count:</strong> {pass.count}</p>
            <p><strong>Duration:</strong> {pass.duration} days</p>
          </div>

          {!recipient ? (
            <div className="search-section">
              <div className="search-type-selector">
                <label>
                  <input
                    type="radio"
                    value="phone"
                    checked={searchType === 'phone'}
                    onChange={(e) => setSearchType(e.target.value as 'phone' | 'memberId')}
                  />
                  Phone Number
                </label>
                <label>
                  <input
                    type="radio"
                    value="memberId"
                    checked={searchType === 'memberId'}
                    onChange={(e) => setSearchType(e.target.value as 'phone' | 'memberId')}
                  />
                  Member ID
                </label>
              </div>
              <div className="search-input">
                <input
                  type="text"
                  placeholder={searchType === 'phone' ? 'Enter phone number' : 'Enter member ID'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRecipient()}
                />
                <button onClick={searchRecipient} disabled={searchLoading}>
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          ) : (
            <div className="transfer-section">
              <div className="user-info">
                <p><strong>Recipient:</strong> {recipient.name}</p>
                <p><strong>Phone:</strong> {recipient.phoneNumber}</p>
                <p><strong>Membership Id:</strong> {recipient.gymMemberId?.[adminGym]}</p>
              </div>
              <div className="modal-actions">
                <button onClick={() => setRecipient(null)}>Back to Search</button>
                <button onClick={handleTransfer} disabled={loading} className="transfer-btn">
                  {loading ? 'Transferring...' : 'Transfer Pass'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddAdminPassModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  adminGym: string;
  onSuccess: () => void;
}> = ({ isOpen, onClose, adminGym, onSuccess }) => {
  const [passName, setPassName] = useState<string>('');
  const [count, setCount] = useState<number | string>('');
  const [price, setPrice] = useState<number | string>('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!functions) return;

    setLoading(true);
    try {
      const addAdminPassFunction = httpsCallable(functions, 'addAdminPass');
      await addAdminPassFunction({
        gymId: adminGym,
        passName,
        count,
        price,
        duration
      });
      alert('Admin pass added successfully!');
      onSuccess();
      onClose();
      // Reset form
      setPassName('');
      setCount('');
      setPrice('');
      setDuration(30);
    } catch (error: any) {
      console.error('Error adding admin pass:', error);
      alert(`Failed to add admin pass: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Add New Admin Pass</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          <div className="add-admin-pass-section">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="modal-passname">Pass Name:</label>
                <input
                  type="text"
                  id="modal-passname"
                  value={passName}
                  onChange={(e) => setPassName(e.target.value)}
                  placeholder="e.g., 10-Day Pass, Monthly Pass"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal-count">Count:</label>
                <input
                  type="number"
                  id="modal-count"
                  value={count}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setCount(''); // Allow empty temporarily
                    } else {
                      setCount(parseInt(value) || 1);
                    }
                  }}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal-price">Total Price (HKD):</label>
                <input
                  type="number"
                  id="modal-price"
                  value={price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setPrice(''); // Allow empty temporarily
                    } else {
                      setPrice(parseInt(value) || 0);
                    }
                  }}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal-duration">Duration (days):</label>
                <input
                  type="number"
                  id="modal-duration"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Admin Pass'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConsumePassModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  adminGym: string;
  onSuccess: () => void;
}> = ({ isOpen, onClose, adminGym, onSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'memberId'>('phone');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [selectedPass, setSelectedPass] = useState<any | null>(null);
  const [userPasses, setUserPasses] = useState<any[]>([]);
  const [consumeCount, setConsumeCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchRecipient = async () => {
    if (!searchTerm.trim() || !db) return;

    setSearchLoading(true);
    try {
      let queryField: string;
      let queryValue: string;

      if (searchType === 'phone') {
        queryField = 'phoneNumber';
        queryValue = searchTerm.trim();
      } else {
        queryField = `gymMemberId.${adminGym}`;
        queryValue = searchTerm.trim();
      }

      const usersQuery = query(collection(db, 'users'), where(queryField, '==', queryValue));
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        alert('No user found with that search criteria.');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      setRecipient({
        id: userId,
        name: userData.name || 'Unknown',
        phoneNumber: userData.phoneNumber || '',
        gymMemberId: userData.gymMemberId || {}
      });

      // Fetch user's passes for this gym
      try {
        console.log('Fetching user passes for user:', userId, 'at gym:', adminGym);
        const userPassesQuery = query(
          collection(db, 'privatePass'),
          where('userRef', '==', doc(db, 'users', userId)),
          where('gymId', '==', adminGym),
          where('active', '==', true)
        );

        const passesSnapshot = await getDocs(userPassesQuery);
        const passes = passesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })); 

        setUserPasses(passes);
        setSelectedPass(null); // Reset selection
      } catch (passError) {
        console.error('Error fetching user passes:', passError);
        setUserPasses([]);
      }
    } catch (error: any) {
      console.error('Error searching for user:', error);
      alert(`Error searching for user: ${error.message || 'Unknown error'}`);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConsume = async () => {
    if (!recipient || !selectedPass || !functions) return;

    setLoading(true);
    try {
      const consumePassFunction = httpsCallable(functions, 'consumePass');
      await consumePassFunction({
        userId: recipient.id,
        passId: selectedPass.id,
        count: consumeCount
      });

      alert(`Successfully consumed ${consumeCount} pass(es) from ${recipient.name}!`);
      onSuccess();
      onClose();
      // Reset form
      setSearchTerm('');
      setRecipient(null);
      setSelectedPass(null);
      setConsumeCount(1);
    } catch (error: any) {
      console.error('Error consuming pass:', error);
      alert(`Failed to consume pass: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Consume User Pass</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          {!recipient ? (
            <div className="search-section">
              <div className="search-type-selector">
                <label>
                  <input
                    type="radio"
                    value="phone"
                    checked={searchType === 'phone'}
                    onChange={(e) => setSearchType(e.target.value as 'phone' | 'memberId')}
                  />
                  Phone Number
                </label>
                <label>
                  <input
                    type="radio"
                    value="memberId"
                    checked={searchType === 'memberId'}
                    onChange={(e) => setSearchType(e.target.value as 'phone' | 'memberId')}
                  />
                  Member ID
                </label>
              </div>
              <div className="search-input">
                <input
                  type="text"
                  placeholder={searchType === 'phone' ? 'Enter phone number' : 'Enter member ID'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRecipient()}
                />
                <button onClick={searchRecipient} disabled={searchLoading}>
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          ) : (
            <div className="consume-section">
              <div className="user-info">
                <p><strong>User:</strong> {recipient.name}</p>
                <p><strong>Phone:</strong> {recipient.phoneNumber}</p>
              </div>

              {userPasses.length > 0 ? (
                <div className="pass-selection">
                  <label>Select Pass to Consume From:</label>
                  <select
                    value={selectedPass?.id || ''}
                    onChange={(e) => {
                      const passId = e.target.value;
                      const pass = userPasses.find(p => p.id === passId) || null;
                      setSelectedPass(pass);
                    }}
                  >
                    <option value="">Select a pass...</option>
                    {userPasses.map((pass) => (
                      <option key={pass.id} value={pass.id}>
                        {pass.gymDisplayName || pass.gymId} - {pass.count} passes available
                      </option>
                    ))}
                  </select>
                  {selectedPass && (
                    <div className="selected-pass-info">
                      <p><strong>Selected Pass:</strong> {selectedPass.gymDisplayName || selectedPass.gymId}</p>
                      <p><strong>Available:</strong> {selectedPass.count} passes</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-passes">
                  <p>No active passes found for this user at {adminGym}.</p>
                </div>
              )}

              <div className="consume-count">
                <label htmlFor="consumeCount">Number of passes to consume:</label>
                <input
                  type="number"
                  id="consumeCount"
                  value={consumeCount}
                  onChange={(e) => setConsumeCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="10"
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setRecipient(null)}>Back to Search</button>
                <button onClick={handleConsume} disabled={loading || !selectedPass || userPasses.length === 0} className="consume-btn">
                  {loading ? 'Consuming...' : 'Consume Pass'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [adminPasses, setAdminPasses] = useState<AdminPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [gymDisplayName, setGymDisplayName] = useState<string>('');
  const [processingPassId, setProcessingPassId] = useState<string | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [addPassModalOpen, setAddPassModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<AdminPass | null>(null);

  useEffect(() => {
    if (!user || !db || !userProfile?.adminGym) {
      setLoading(false);
      return;
    }

    const adminPassQuery = query(
      collection(db, 'adminPass'),
      where('gymId', '==', userProfile.adminGym),
      where('active', '==', true)
    );

    const unsub = onSnapshot(adminPassQuery, snapshot => {
      const passes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AdminPass));
      setAdminPasses(passes);
      setLoading(false);
    });

    return () => unsub();
  }, [user, userProfile?.adminGym]);

  useEffect(() => {
    const fetchGymDisplayName = async () => {
      if (!db || !userProfile?.adminGym) {
        setGymDisplayName('[No Gym Assigned]');
        return;
      }

      try {
        const gymsQuery = query(collection(db, 'gyms'), where('id', '==', userProfile.adminGym));
        const querySnapshot = await getDocs(gymsQuery);

        if (!querySnapshot.empty) {
          const gymDoc = querySnapshot.docs[0];
          const gymData = gymDoc.data();
          setGymDisplayName(gymData.displayName || userProfile.adminGym);
        } else {
          setGymDisplayName(userProfile.adminGym);
        }
      } catch (error) {
        console.error('Error fetching gym display name:', error);
        setGymDisplayName(userProfile.adminGym);
      }
    };

    fetchGymDisplayName();
  }, [db, userProfile?.adminGym]);

  const handleAction = (action: string, pass: AdminPass) => {
    switch (action) {
      case 'transfer':
        setSelectedPass(pass);
        setTransferModalOpen(true);
        break;
      case 'deactivate':
        if (window.confirm('Are you sure you want to deactivate this admin pass? This action cannot be undone.')) {
          handleDeactivate(pass);
        }
        break;
      default:
        alert(`Action: ${action} on pass ${pass.id}`);
    }
  };

  const handleDeactivate = async (pass: AdminPass) => {
    if (!functions) return;

    setProcessingPassId(pass.id);
    try {
      const deactivateAdminPassFunction = httpsCallable(functions, 'deactivateAdminPass');
      await deactivateAdminPassFunction({
        adminPassId: pass.id
      });
      alert('Admin pass deactivated successfully!');
    } catch (error: any) {
      console.error('Error deactivating admin pass:', error);
      alert(`Failed to deactivate admin pass: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingPassId(null);
    }
  };

  const handleSuccess = () => {
    // Force a refresh by temporarily clearing and re-setting the loading state
    // This ensures the onSnapshot listener gets properly re-established
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  };

  if (!userProfile?.isAdmin) {
    return (
      <div className="admin-page">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div>Loading admin passes...</div>;
  }

  return (
    <div className="admin-page">
      <div className="profile-card">
        <div className="profile-card-header">
          <h2>Admin Portal - {gymDisplayName || '[No Gym Assigned]'}</h2>
          <div className="admin-actions">
            <button
              onClick={() => setAddPassModalOpen(true)}
              className="btn add-admin-pass-btn"
            >
              Add Admin Pass
            </button>
            <button
              onClick={() => setConsumeModalOpen(true)}
              className="btn consume-pass-btn"
            >
              Consume Pass
            </button>
          </div>
        </div>
        <div className="profile-card-body">
          <div className="admin-content">
            <div className="admin-pass-list-section">
              <h2>Active Admin Passes</h2>
              <div className="admin-pass-list">
                {adminPasses.length > 0 ? (
                  adminPasses.map(pass => (
                    <div key={pass.id} className="admin-pass-card">
                      <div className="admin-pass-body">
                        <p>Price: HKD {pass.price}</p>
                        <p>Duration: {pass.duration} days</p>
                      </div>
                      <div className="admin-pass-actions">
                        <button
                          onClick={() => handleAction('transfer', pass)}
                          disabled={processingPassId === pass.id}
                        >
                          Sell
                        </button>
                        <button
                          onClick={() => handleAction('deactivate', pass)}
                          disabled={processingPassId === pass.id}
                          className="deactivate-btn"
                        >
                          {processingPassId === pass.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No active admin passes found for your gym.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddAdminPassModal
        isOpen={addPassModalOpen}
        onClose={() => setAddPassModalOpen(false)}
        adminGym={userProfile?.adminGym || ''}
        onSuccess={handleSuccess}
      />

      <TransferAdminPassModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        pass={selectedPass}
        adminGym={userProfile?.adminGym || ''}
        onSuccess={handleSuccess}
      />

      <ConsumePassModal
        isOpen={consumeModalOpen}
        onClose={() => setConsumeModalOpen(false)}
        adminGym={userProfile?.adminGym || ''}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default AdminPage;