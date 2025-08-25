import React, { useState } from 'react';
import { db, functions } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { AdminPass, User } from '../types/admin';
import '../css/Dialog.css';

const SellAdminPassModal: React.FC<{
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

  const handleSell = async () => {
    if (!recipient || !pass || !functions) return;

    setLoading(true);
    try {
      const sellAdminPassFunction = httpsCallable(functions, 'sellAdminPass');
      await sellAdminPassFunction({
        adminPassId: pass.id,
        recipientUserId: recipient.id,
      });

      alert(`Successfully sold share passes to ${recipient.name}!`);
      onSuccess();
      onClose();
      // Reset form
      setSearchTerm('');
      setRecipient(null);
    } catch (error: any) {
      console.error('Error selling admin pass:', error);
      alert(`Failed to sell admin pass: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pass) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Sell Admin Pass</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          <div className="pass-info">
            <p><strong>Pass Name:</strong> {pass.passName}</p>
            <p><strong>Count:</strong> {pass.count}</p>
            <p><strong>Price:</strong> $ {pass.price}</p>
            <p><strong>Duration:</strong> {pass.duration} months</p>
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
                <p><strong>Phone Number:</strong> {recipient.phoneNumber}</p>
                <p><strong>Membership Id:</strong> {recipient.gymMemberId?.[adminGym]}</p>
              </div>
              <div className="modal-actions">
                <button onClick={() => setRecipient(null)}>Back to Search</button>
                <button onClick={handleSell} disabled={loading} className="transfer-btn">
                  {loading ? 'Selling...' : 'Sell Pass'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellAdminPassModal;
