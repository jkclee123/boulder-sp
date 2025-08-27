import React, { useState, useEffect } from 'react';
import { db, functions } from '../firebase';
import { collection, query, where, getDocs, doc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { User } from '../types/admin';
import '../css/Dialog.css';

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

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setRecipient(null);
      setSelectedPass(null);
      setUserPasses([]);
      setConsumeCount(1);
      setLoading(false);
      setSearchLoading(false);
    }
  }, [isOpen]);

  const handleIncrement = () => {
    if (selectedPass) {
      const maxAvailable = selectedPass.count;
      setConsumeCount(prev => Math.min(prev + 1, maxAvailable));
    } else {
      setConsumeCount(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    setConsumeCount(prev => Math.max(1, prev - 1));
  };

  const searchUser = async () => {
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

      const usersQuery = query(collection(db!, 'users'), where(queryField, '==', queryValue));
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        alert('No user found with that search criteria.');
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      const user = {
        id: userId,
        name: userData.name || 'Unknown',
        phoneNumber: userData.phoneNumber || '',
        gymMemberId: userData.gymMemberId || {}
      };

      setRecipient(user);
      return user;
    } catch (error: any) {
      console.error('Error searching for user:', error);
      alert(`Error searching for user: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  const fetchUserPasses = async (userId: string) => {
    try {
      console.log('Fetching user passes for user:', userId, 'at gym:', adminGym);
      const userRef = doc(db!, 'users', userId);
      // Use UTC-preserving approach to match backend UTC handling
      const now = new Date();
      const currentDate = Timestamp.fromMillis(now.getTime());

      // Query private passes first
      const privatePassesQuery = query(
        collection(db!, 'privatePass'),
        where('userRef', '==', userRef),
        where('gymId', '==', adminGym),
        where('active', '==', true),
        where('count', '>', 0),
        where('lastDay', '>', currentDate)
      );

      // Query market passes
      const marketPassesQuery = query(
        collection(db!, 'marketPass'),
        where('userRef', '==', userRef),
        where('active', '==', true),
        where('count', '>', 0),
        where('lastDay', '>', currentDate)
      );

      // Execute both queries
      const [privateSnapshot, marketSnapshot] = await Promise.all([
        getDocs(privatePassesQuery),
        getDocs(marketPassesQuery)
      ]);

      // Map private passes
      const privatePasses = privateSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'private'
      }));

      // Map market passes
      const marketPasses = marketSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'market'
      }));

      // Combine passes with private passes first
      const allPasses = [...privatePasses, ...marketPasses];

      setUserPasses(allPasses);
      // Set first pass as default selection if available
      setSelectedPass(allPasses.length > 0 ? allPasses[0] : null);
    } catch (passError) {
      console.error('Error fetching user passes:', passError);
      setUserPasses([]);
    }
  };

  const searchRecipient = async () => {
    if (!searchTerm.trim() || !db) return;

    setSearchLoading(true);
    try {
      const user = await searchUser();
      if (user) {
        await fetchUserPasses(user.id);
      }
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
      console.error('Consume error:', error?.code, error?.message);
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
                  type={searchType === 'phone' ? 'tel' : 'text'}
                  placeholder={searchType === 'phone' ? 'Enter phone number' : 'Enter member ID'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchRecipient()}
                />
                <button onClick={searchRecipient} disabled={searchLoading}>
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          ) : (
            <div className="consume-section">
              <div className="user-info">
                <p><strong>Name:</strong> {recipient.name}</p>
                <p><strong>Phone number:</strong> {recipient.phoneNumber}</p>
                <p><strong>Member Id:</strong> {(recipient.gymMemberId || {})[adminGym] || ''}</p>
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
                      // Reset count to 1 when switching passes to ensure valid range
                      setConsumeCount(1);
                    }}
                  >
                    {userPasses.map((pass) => (
                      <option key={pass.id} value={pass.id}>
                        {pass.passName} - {pass.count} punches available
                      </option>
                    ))}
                  </select>
                  {selectedPass && (
                    <div className="selected-pass-info">
                      <p><strong>Selected Pass:</strong> {selectedPass.passName}</p>
                      <p><strong>Available:</strong> {selectedPass.count} punches</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-passes">
                  <p>No active passes found for this user at {adminGym}.</p>
                </div>
              )}

              <div className="consume-count">
                <label>Number of punches to consume:</label>
                <div className="count-controls">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={consumeCount <= 1}
                    className="count-btn count-btn-decrement"
                  >
                    -
                  </button>
                  <span className="count-display">{consumeCount}</span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={selectedPass && consumeCount >= selectedPass.count}
                    className="count-btn count-btn-increment"
                  >
                    +
                  </button>
                </div>
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

export default ConsumePassModal;
