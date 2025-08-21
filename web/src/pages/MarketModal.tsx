import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import '../css/TransferModal.css';

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: {
    id: string;
    gymDisplayName: string;
    count: number;
    type: 'private';
  };
  onSuccess: () => void;
}

const MarketModal: React.FC<MarketModalProps> = ({ isOpen, onClose, pass, onSuccess }) => {
  const [formData, setFormData] = useState({
    count: 1,
    price: 0,
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.count > pass.count) {
      setError('Cannot list more passes than you own');
      setLoading(false);
      return;
    }

    if (formData.count <= 0) {
      setError('Count must be greater than 0');
      setLoading(false);
      return;
    }

    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      const listPassForMarket = httpsCallable(functions, 'listPassForMarket');
      await listPassForMarket({
        privatePassId: pass.id,
        count: formData.count,
        price: formData.price,
        remarks: formData.remarks
      });

      onSuccess();
      onClose();
      setFormData({ count: 1, price: 0, remarks: '' });
    } catch (err: any) {
      console.error('Error listing pass for market:', err);
      setError(err.message || 'Failed to list pass for market');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ count: 1, price: 0, remarks: '' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>List Pass for Sale</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="pass-info">
            <h3>{pass.gymDisplayName}</h3>
            <p>Available Count: {pass.count}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="count">Count to List *</label>
              <input
                type="text"
                inputMode="numeric"
                id="count"
                min="1"
                max={pass.count}
                value={formData.count}
                onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price per Pass (HKD) *</label>
              <input
                type="text"
                inputMode="decimal"
                id="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="remarks">Remarks (Optional)</label>
              <textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Any additional information about the passes..."
                rows={3}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button type="button" onClick={handleClose} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Listing...' : 'List for Sale'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MarketModal;
