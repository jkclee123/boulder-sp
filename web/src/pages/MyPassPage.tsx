import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import '../css/MyPassPage.css';
import TransferModal from './TransferModal';

interface Pass {
  id: string;
  gymDisplayName: string;
  count: number;
  lastDay: Timestamp;
}

interface PrivatePass extends Pass {
  type: 'private';
}

interface MarketPass extends Pass {
  type: 'market';
  price: number;
  privatePassRef: any;
}

type AnyPass = PrivatePass | MarketPass;

const PassCard: React.FC<{ pass: AnyPass; onAction: (action: string, pass: AnyPass) => void }> = ({ pass, onAction }) => {
  const isExpired = pass.lastDay.toDate() < new Date();

  return (
    <div className={`pass-card ${isExpired ? 'expired' : ''}`}>
      <div className={`pass-card-header ${pass.type === 'private' ? 'private-pass' : 'market-pass'} ${isExpired ? 'expired-pass' : ''}`}>
        <h3>{pass.gymDisplayName}</h3>
      </div>
      <div className="pass-card-body">
        <p>Count: {pass.count}</p>
        {pass.type === 'market' && <p>Price: ${pass.price}</p>}
        <p>Expires: {pass.lastDay.toDate().toLocaleDateString()}</p>
      </div>
      <div className="pass-card-actions">
        {isExpired ? (
          <button onClick={() => onAction('deactivate', pass)}>De-activate</button>
        ) : (
          <>
            <button onClick={() => onAction('transfer', pass)}>Transfer</button>
            {pass.type === 'private' && <button onClick={() => onAction('market', pass)}>Market</button>}
            {pass.type === 'market' && <button onClick={() => onAction('unlist', pass)}>Unlist</button>}
          </>
        )}
      </div>
    </div>
  );
};

const MyPassPage: React.FC = () => {
  const { user } = useAuth();
  const [privatePasses, setPrivatePasses] = useState<PrivatePass[]>([]);
  const [marketPasses, setMarketPasses] = useState<MarketPass[]>([]);
  const [expiredPasses, setExpiredPasses] = useState<AnyPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<AnyPass | null>(null);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const privatePassQuery = query(collection(db, 'privatePass'), where('userRef', '==', userRef), where('active', '==', true));
    const marketPassQuery = query(collection(db, 'marketPass'), where('userRef', '==', userRef), where('active', '==', true));

    const unsubPrivate = onSnapshot(privatePassQuery, snapshot => {
      const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'private' } as PrivatePass));
      const active = passes.filter(p => p.lastDay.toDate() >= new Date());
      const expired = passes.filter(p => p.lastDay.toDate() < new Date());
      setPrivatePasses(active);
      setExpiredPasses(prev => [...prev.filter(p => p.type !== 'private'), ...expired]);
      setLoading(false);
    });

    const unsubMarket = onSnapshot(marketPassQuery, snapshot => {
      const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'market' } as MarketPass));
      const active = passes.filter(p => p.lastDay.toDate() >= new Date());
      const expired = passes.filter(p => p.lastDay.toDate() < new Date() && p.count > 0);
      setMarketPasses(active);
      setExpiredPasses(prev => [...prev.filter(p => p.type !== 'market'), ...expired]);
      setLoading(false);
    });

    return () => {
      unsubPrivate();
      unsubMarket();
    };
  }, [user]);

  const handleAction = (action: string, pass: AnyPass) => {
    console.log(`Action: ${action} on pass:`, pass);

    switch (action) {
      case 'transfer':
        if (pass.lastDay.toDate() < new Date()) {
          alert('Cannot transfer expired passes.');
          return;
        }
        setSelectedPass(pass);
        setTransferModalOpen(true);
        break;
      case 'market':
        // TODO: Implement market listing
        alert('Market listing functionality coming soon!');
        break;
      case 'unlist':
        // TODO: Implement unlist functionality
        alert('Unlist functionality coming soon!');
        break;
      case 'deactivate':
        // TODO: Implement deactivate functionality
        alert('Deactivate functionality coming soon!');
        break;
      default:
        alert(`Action: ${action} on pass ${pass.id}. Check console for details.`);
    }
  };

  const handleTransferSuccess = () => {
    // Refresh the passes data
    setLoading(true);
    // The useEffect will automatically refresh the data due to onSnapshot
  };

  if (loading) {
    return <div>Loading passes...</div>;
  }

  return (
    <div className="my-pass-page">
            <h1 className="page-header">My Passes</h1>

      <div className="pass-list-section">
        <h2>Private Passes</h2>
        <div className="pass-list">
          {privatePasses.length > 0 ? (
            privatePasses.map(pass => <PassCard key={pass.id} pass={pass} onAction={handleAction} />)
          ) : (
            <p>No active private passes.</p>
          )}
        </div>
      </div>

      <div className="pass-list-section">
        <h2>Market Passes</h2>
        <div className="pass-list">
          {marketPasses.length > 0 ? (
            marketPasses.map(pass => <PassCard key={pass.id} pass={pass} onAction={handleAction} />)
          ) : (
            <p>No active market passes.</p>
          )}
        </div>
      </div>

      <div className="pass-list-section">
        <h2>Expired Passes</h2>
        <div className="pass-list">
          {expiredPasses.length > 0 ? (
            expiredPasses.map(pass => <PassCard key={pass.id} pass={pass} onAction={handleAction} />)
          ) : (
            <p>No expired passes.</p>
          )}
        </div>
      </div>

      {selectedPass && (
        <TransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          pass={selectedPass}
          onTransferSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
};

export default MyPassPage;