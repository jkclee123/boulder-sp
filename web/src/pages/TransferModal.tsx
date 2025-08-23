import React, { useState } from 'react';
import { db, functions } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../providers/AuthProvider';
import '../css/TransferModal.css';

interface User {
  id: string;
  name: string;
  phoneNumber: string;
  gymMemberId?: { [gymId: string]: string };
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: any;
  onTransferSuccess: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, pass, onTransferSuccess }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'phone' | 'memberId'>('phone');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [transferCount, setTransferCount] = useState(1);
  const [transferPrice, setTransferPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [step, setStep] = useState<'search' | 'confirm' | 'details'>('search');

  const searchRecipient = async () => {
    if (!searchTerm.trim() || !db) return;

    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm) {
      alert('Please enter a search term.');
      return;
    }

    console.log('Search debug:', {
      searchTerm: trimmedSearchTerm,
      searchType,
      passGymId: pass.gymId,
      passType: pass.type
    });

    setSearchLoading(true);
    try {
      let q;
      if (searchType === 'phone') {
        // Ensure we have a valid search term for phone number
        console.log('Searching by phone number:', trimmedSearchTerm);
        q = query(collection(db, 'users'), where('phoneNumber', '==', trimmedSearchTerm));
      } else {
        // For gymMemberId search, we need to search within the map
        // This is more complex as Firestore doesn't support direct map value queries
        // We'll fetch all users and filter client-side for now
        console.log('Searching all users for gym member ID:', trimmedSearchTerm, 'in gym:', pass.gymId);
        q = query(collection(db, 'users'));
      }

      const querySnapshot = await getDocs(q);
      let foundUser: User | null = null;

      if (searchType === 'phone') {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data() as any; // Use any to avoid strict typing issues
          foundUser = {
            id: userDoc.id,
            name: userData.name || '',
            phoneNumber: userData.phoneNumber || '',
            gymMemberId: userData.gymMemberId || {}
          };
        }
      } else {
        // Client-side filtering for gymMemberId
        if (!pass.gymId) {
          alert('No gym selected for member ID search.');
          return;
        }

        for (const userDoc of querySnapshot.docs) {
          const userData = userDoc.data() as any;
          // Safe access to gymMemberId map
          const gymMemberIdMap = userData.gymMemberId || {};
          if (gymMemberIdMap[pass.gymId] === trimmedSearchTerm) {
            foundUser = {
              id: userDoc.id,
              name: userData.name || '',
              phoneNumber: userData.phoneNumber || '',
              gymMemberId: gymMemberIdMap
            };
            break;
          }
        }
      }

      if (foundUser) {
        // Check if the found user is the current user
        if (foundUser.id === user?.uid) {
          alert('You cannot transfer passes to yourself.');
          return;
        }
        setRecipient(foundUser);
        setStep('confirm');
      } else {
        alert('User not found. Please check the search term and try again.');
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      console.error('Error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        searchTerm: trimmedSearchTerm,
        searchType,
        passGymId: pass.gymId
      });

      // Provide more specific error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error searching for user: ${errorMessage}`);
    } finally {
      setSearchLoading(false);
    }
  };

  const proceedToDetails = () => {
    setStep('details');
  };

  const executeTransfer = async () => {
    if (!user || !recipient || transferCount <= 0 || !functions) return;

    if (transferCount > pass.count) {
      alert('Transfer count cannot exceed available passes.');
      return;
    }

    setLoading(true);
    try {
      if (!functions) {
        throw new Error('Firebase functions not initialized. Please check your configuration.');
      }

      const transferFunction = httpsCallable(functions, 'transfer');
      await transferFunction({
        fromUserId: user.uid,
        toUserId: recipient.id,
        passId: pass.id,
        passType: pass.type,
        count: transferCount,
        price: transferPrice,
      });

      alert('Transfer successful!');
      onTransferSuccess();
      onClose();
      resetModal();
    } catch (error: any) {
      console.error('Error executing transfer:', error);
      const errorMessage = error.message || 'Error executing transfer. Please try again.';
      alert(`Transfer failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSearchTerm('');
    setRecipient(null);
    setTransferCount(1);
    setTransferPrice(0);
    setStep('search');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Transfer Pass</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {step === 'search' && (
            <div className="search-step">
              <div className="pass-info">
                <h3>Transferring from {pass.gymDisplayName}</h3>
                <p>Available: {pass.count} passes</p>
                <p>Expires: {pass.lastDay.toDate().toLocaleDateString()}</p>
              </div>

              <div className="search-form">
                <div className="search-type-selector">
                  <label>
                    <input
                      type="radio"
                      value="phone"
                      checked={searchType === 'phone'}
                      onChange={() => setSearchType('phone')}
                    />
                    Phone Number
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="memberId"
                      checked={searchType === 'memberId'}
                      onChange={() => setSearchType('memberId')}
                    />
                    Gym Member ID
                  </label>
                </div>

                <input
                  type="text"
                  placeholder={searchType === 'phone' ? 'Enter phone number' : 'Enter gym member ID'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && searchRecipient()}
                />

                <button
                  onClick={searchRecipient}
                  disabled={searchLoading || !searchTerm.trim()}
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && recipient && (
            <div className="confirm-step">
              <h3>Confirm Recipient</h3>
              <div className="recipient-info">
                <p><strong>Name:</strong> {recipient.name}</p>
                {searchType === 'phone' && (
                  <p><strong>Phone:</strong> {recipient.phoneNumber}</p>
                )}
                {searchType === 'memberId' && recipient.gymMemberId && recipient.gymMemberId[pass.gymId] && (
                  <p><strong>Gym Member ID:</strong> {recipient.gymMemberId[pass.gymId]}</p>
                )}
              </div>

              <div className="action-buttons">
                <button onClick={() => setStep('search')}>Back</button>
                <button onClick={proceedToDetails}>Continue</button>
              </div>
            </div>
          )}

          {step === 'details' && recipient && (
            <div className="details-step">
              <h3>Transfer Details</h3>

              <div className="transfer-form">
                <div className="form-group">
                  <label>Number of passes to transfer:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={transferCount.toString()}
                    onChange={e => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      const numValue = parseInt(value) || 0;
                      setTransferCount(Math.min(pass.count, Math.max(0, numValue)));
                    }}
                  />
                  <small>Maximum: {pass.count}</small>
                </div>

                <div className="form-group">
                  <label>Total transfer price (HKD):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={transferPrice.toString()}
                    onChange={e => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      // Ensure only one decimal point
                      const parts = value.split('.');
                      const cleanValue = parts[0] + (parts[1] ? '.' + parts[1] : '');
                      const numValue = parseFloat(cleanValue) || 0;
                      setTransferPrice(Math.max(0, numValue));
                    }}
                  />
                </div>

                <div className="transfer-summary">
                  <h4>Transfer Summary</h4>
                  <p><strong>From:</strong> You</p>
                  <p><strong>To:</strong> {recipient.name}</p>
                  <p><strong>Passes:</strong> {transferCount}</p>
                  <p><strong>Price:</strong> ${transferPrice.toFixed(2)}</p>
                  <p><strong>Gym:</strong> {pass.gymDisplayName}</p>
                </div>
              </div>

              <div className="action-buttons">
                <button onClick={() => setStep('confirm')}>Back</button>
                <button
                  onClick={executeTransfer}
                  disabled={loading || transferCount <= 0}
                  className="primary-button"
                >
                  {loading ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
