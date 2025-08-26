import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db, functions } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { AdminPass } from '../types/admin';
import AddAdminPassModal from './AddAdminPassModal';
import SellAdminPassModal from './SellAdminPassModal';
import ConsumePassModal from './ConsumePassModal';
import '../css/AdminPage.css';

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
          setGymDisplayName(gymData.displayName || '[No Gym Assigned]');
        } else {
          setGymDisplayName('[No Gym Assigned]');
        }
      } catch (error) {
        setGymDisplayName('[No Gym Assigned]');
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
      case 'delete':
        handleDelete(pass);
        break;
      default:
        alert(`Action: ${action} on pass ${pass.id}`);
    }
  };

  const handleDelete = async (pass: AdminPass) => {
    if (!functions) return;

    setProcessingPassId(pass.id);
    try {
      const deleteAdminPassFunction = httpsCallable(functions, 'deleteAdminPass');
      await deleteAdminPassFunction({
        adminPassId: pass.id
      });
      // alert('Admin pass deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting admin pass:', error);
      alert(`Failed to delete admin pass: ${error.message || 'Unknown error'}`);
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
              <div className="admin-pass-section-header">
                <h3>Share Passes</h3>
                <button
                  onClick={() => setAddPassModalOpen(true)}
                  className="btn add-admin-pass-btn"
                >
                  Add Pass
                </button>
              </div>
              <div className="admin-pass-list">
                {adminPasses.length > 0 ? (
                  adminPasses.map(pass => (
                    <div key={pass.id} className="admin-pass-card">
                      <div className="admin-pass-body">
                        <h3>{pass.passName}</h3>
                        <p>Punches: {pass.count}</p>
                        <p>Price: ${pass.price}</p>
                        <p>Valid for: {pass.duration} months</p>
                      </div>
                      <div className="admin-pass-actions">
                        <button
                          onClick={() => handleAction('transfer', pass)}
                          disabled={processingPassId === pass.id}
                        >
                          Sell
                        </button>
                        <button
                          onClick={() => handleAction('delete', pass)}
                          disabled={processingPassId === pass.id}
                          className="delete-btn"
                        >
                          {processingPassId === pass.id ? 'Deleting...' : 'Delete'}
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
        gymId={userProfile?.adminGym || ''}
        gymDisplayName={gymDisplayName}
        onSuccess={handleSuccess}
      />

      <SellAdminPassModal
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