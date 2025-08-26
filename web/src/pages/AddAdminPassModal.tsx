import React, { useState } from 'react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

interface AddAdminPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymId: string;
  gymDisplayName: string;
  onSuccess: () => void;
}

const AddAdminPassModal: React.FC<AddAdminPassModalProps> = ({ isOpen, onClose, gymId, gymDisplayName, onSuccess }) => {
  const [passName, setPassName] = useState<string>('');
  const [count, setCount] = useState<number | string>('');
  const [price, setPrice] = useState<number | string>('');
  const [duration, setDuration] = useState<number | string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!functions) return;

    setLoading(true);

    try {
      const addAdminPassFunction = httpsCallable(functions, 'addAdminPass');
      await addAdminPassFunction({
        gymId,
        gymDisplayName,
        passName,
        count,
        price,
        duration
      });

      onSuccess();
      onClose();
      // Reset form
      setPassName('');
      setCount('');
      setPrice('');
      setDuration(3);
    } catch (error: any) {
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
          <h2>Add New Share Pass</h2>
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
                  placeholder="e.g., 30 Share Pass, 50 Share Pass"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal-count">Punches:</label>
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
                <label htmlFor="modal-duration">Valid for (months):</label>
                <input
                  type="number"
                  id="modal-duration"
                  value={duration}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setDuration(''); // Allow empty temporarily
                    } else {
                      setDuration(Math.max(1, parseInt(value) || 1));
                    }
                  }}
                  min="1"
                  required
                />
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Pass'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAdminPassModal;
