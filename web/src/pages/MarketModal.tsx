import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import '../css/MarketModal.css';

interface MarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: {
    id: string;
    gymDisplayName: string;
    count: number;
    type: 'private';
    purchasePrice?: number;
    purchaseCount?: number;
  };
  onSuccess: () => void;
}

const MarketModal: React.FC<MarketModalProps> = ({ isOpen, onClose, pass, onSuccess }) => {
  const [formData, setFormData] = useState({
    count: '',
    price: '',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    const countValue = parseInt(formData.count.toString()) || 0;
    if (countValue > pass.count) {
      setError('Cannot list more passes than you own');
      setLoading(false);
      return;
    }

    const priceValue = parseFloat(formData.price.toString()) || 0;

    if (countValue <= 0) {
      setError('Count must be greater than 0');
      setLoading(false);
      return;
    }

    if (priceValue <= 0) {
      setError('Price must be greater than 0');
      setLoading(false);
      return;
    }

    try {   
      if (!functions) {
        throw new Error('Firebase functions not initialized. Please check your configuration.');
      }
      const listPassForMarket = httpsCallable(functions, 'listPassForMarket');
      await listPassForMarket({
        privatePassId: pass.id,
        count: countValue,
        price: priceValue,
        remarks: formData.remarks
      });

      onSuccess();
      onClose();
      setFormData({ count: '', price: '', remarks: '' });
    } catch (err: any) {
      console.error('Error listing pass for market:', err);
      setError(err.message || 'Failed to list pass for market');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ count: '', price: '', remarks: '' });
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
            {pass.type === 'private' && pass.purchasePrice && pass.purchaseCount && pass.purchaseCount > 0 ? (
              <p>Avg Price: ${(pass.purchasePrice / pass.purchaseCount).toFixed(0)}</p>
            ) : 0}
            <p>Available Punches: {pass.count}</p>
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
                onChange={(e) => setFormData(prev => ({ ...prev, count: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
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
