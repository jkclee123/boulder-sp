import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import '../css/MyPassPage.css';
import TransferPrivatePassModal from './TransferPrivatePassModal';
import SellMarketPassModal from './SellMarketPassModal';
import MarketModal from './MarketModal';

interface Pass {
  id: string;
  gymDisplayName: string;
  gymId: string;
  count: number;
  lastDay: Timestamp;
  purchasePrice?: number;
  purchaseCount?: number;
}

interface PrivatePass extends Pass {
  type: 'private';
  passName: string;
} 

interface MarketPass extends Pass {
  type: 'market';
  price: number;
  privatePassRef: any;
  passName: string;
}

type AnyPass = PrivatePass | MarketPass;

// --- Helper Components ---

const MyPassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`my-pass-card ${className || ''}`}>{children}</div>
);

const MyPassCardHeader = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="my-pass-card-header">
    <h2>{title}</h2>
    <div>{children}</div>
  </div>
);

const MyPassCardBody = ({ children }: { children: React.ReactNode }) => (
  <div className="my-pass-card-body">{children}</div>
);

// Private Pass Card Component - for active private passes
const PrivatePassCard: React.FC<{ pass: PrivatePass; onAction: (action: string, pass: PrivatePass) => void }> = ({ pass, onAction }) => {
  return (
    <div className="pass-card">
      <div className="pass-card-header private-pass">
        <h3>{pass.passName}</h3>
      </div>
      <div className="pass-card-body">
        <p>Gym: {pass.gymDisplayName}</p>
        {pass.purchasePrice && pass.purchaseCount && pass.purchaseCount > 0 && (
          <p>Avg Price: ${(pass.purchasePrice / pass.purchaseCount).toFixed(0)}</p>
        )}
        <p>Remaining Punches: {pass.count}</p>
        <p>Expires: {pass.lastDay.toDate().toLocaleDateString()}</p>
      </div>
      <div className="pass-card-actions">
        <button onClick={() => onAction('transfer_private', pass)}>Transfer</button>
        <button onClick={() => onAction('market', pass)}>Market</button>
      </div>
    </div>
  );
};

// Market Pass Card Component - for active market passes
const MarketPassCard: React.FC<{ pass: MarketPass; onAction: (action: string, pass: MarketPass) => void; isUnlisting?: boolean }> = ({ pass, onAction, isUnlisting = false }) => {
  return (
    <div className="pass-card">
      <div className="pass-card-header market-pass">
        <h3>{pass.passName}</h3>
      </div>
      <div className="pass-card-body">
        <p>Gym: {pass.gymDisplayName}</p>
        <p>Price: ${pass.price}</p>
        <p>Remaining Punches: {pass.count}</p>
        <p>Expires: {pass.lastDay.toDate().toLocaleDateString()}</p>
      </div>
      <div className="pass-card-actions">
        <button onClick={() => onAction('sell_market', pass)}>Sell</button>
        <button
          onClick={() => onAction('unlist', pass)}
          disabled={isUnlisting}
        >
          {isUnlisting ? 'Unlisting...' : 'Unlist'}
        </button>
      </div>
    </div>
  );
};

// Expired Pass Card Component - for expired passes (both private and market)
const ExpiredPassCard: React.FC<{ pass: AnyPass; onAction: (action: string, pass: AnyPass) => void }> = ({ pass, onAction }) => {
  return (
    <div className="pass-card expired">
      <div className="pass-card-header expired-pass">
        <h3>{pass.passName}</h3>
      </div>
      <div className="pass-card-body">
        <p>Gym: {pass.gymDisplayName}</p>
        <p>Remaining Punches: {pass.count}</p>
        <p>Expired: {pass.lastDay.toDate().toLocaleDateString()}</p>
      </div>
      <div className="pass-card-actions">
        <button onClick={() => onAction('remove', pass)}>Remove</button>
      </div>
    </div>
  );
};

const MyPassPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [privatePasses, setPrivatePasses] = useState<PrivatePass[]>([]);
  const [marketPasses, setMarketPasses] = useState<MarketPass[]>([]);
  const [expiredPasses, setExpiredPasses] = useState<AnyPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferPrivateModalOpen, setTransferPrivateModalOpen] = useState(false);
  const [sellMarketModalOpen, setSellMarketModalOpen] = useState(false);
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<AnyPass | null>(null);
  const [unlistingPassId, setUnlistingPassId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const privatePassQuery = query(collection(db, 'privatePass'), where('userRef', '==', userRef), where('active', '==', true));
    const marketPassQuery = query(collection(db, 'marketPass'), where('userRef', '==', userRef), where('active', '==', true), where('count', '>', 0));

    const unsubPrivate = onSnapshot(privatePassQuery, snapshot => {
      const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'private' } as PrivatePass));
      // Use UTC-preserving approach to match backend UTC handling
      const now = new Date();
      const active = passes.filter(p => p.lastDay.toDate().getTime() >= now.getTime() && p.count > 0);
      const expired = passes.filter(p => p.lastDay.toDate().getTime() < now.getTime() || p.count === 0);
      setPrivatePasses(active);
      setExpiredPasses(prev => [...prev.filter(p => p.type !== 'private'), ...expired]);
      setLoading(false);
    });

    const unsubMarket = onSnapshot(marketPassQuery, snapshot => {
      const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'market' } as MarketPass));
      // Use UTC-preserving approach to match backend UTC handling
      // Query already filters count > 0, so we only need to check expiration date
      const now = new Date();
      const active = passes.filter(p => p.lastDay.toDate().getTime() >= now.getTime());
      const expired = passes.filter(p => p.lastDay.toDate().getTime() < now.getTime());
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

    // Use UTC-preserving approach to match backend UTC handling
    const now = new Date();

    switch (action) {
      case 'transfer_private':
        if (pass.lastDay.toDate().getTime() < now.getTime()) {
          alert('Cannot transfer expired passes.');
          return;
        }
        setSelectedPass(pass);
        setTransferPrivateModalOpen(true);
        break;
      case 'sell_market':
        if (pass.lastDay.toDate().getTime() < now.getTime()) {
          alert('Cannot sell expired passes.');
          return;
        }
        setSelectedPass(pass);
        setSellMarketModalOpen(true);
        break;
      case 'market':
        if (!userProfile?.telegramId) {
          alert('You must set your Telegram ID in your profile before you can list passes for sale. Go to Account page to set it.');
          return;
        }
        if (pass.lastDay.toDate().getTime() < now.getTime()) {
          alert('Cannot list expired passes for sale.');
          return;
        }
        setSelectedPass(pass);
        setMarketModalOpen(true);
        break;
      case 'unlist':
        handleUnlist(pass);
        break;
      case 'remove':
        handleRemove(pass);
        break;
      default:
        alert(`Action: ${action} on pass ${pass.id}. Check console for details.`);
    }
  };

  const handleTransferSuccess = () => {
    // Close both transfer modals when transfer is successful
    setTransferPrivateModalOpen(false);
    setSellMarketModalOpen(false);
    // The onSnapshot listeners will automatically update the data when Firestore changes
    // No manual refresh needed - the real-time listeners handle this
  };

  const handleMarketSuccess = () => {
    // Close market modal when market operation is successful
    setMarketModalOpen(false);
    setSelectedPass(null);
    // The onSnapshot listeners will automatically update the data when Firestore changes
    // No manual refresh needed - the real-time listeners handle this
  };

  const handleUnlist = async (pass: AnyPass) => {
    if (!user || !functions || pass.type !== 'market') return;

    setUnlistingPassId(pass.id);
    try {
      const unlistFunction = httpsCallable(functions, 'unlistPass');
      await unlistFunction({
        marketPassId: pass.id,
        userId: user.uid
      });

      // alert('Pass unlisted successfully! The count has been merged back to your private pass.');
    } catch (error: any) {
      console.error('Error unlisting pass:', error);
      alert(`Failed to unlist pass: ${error.message || 'Unknown error'}`);
    } finally {
      setUnlistingPassId(null);
    }
  };

  const handleRemove = async (pass: AnyPass) => {
    if (!user || !functions) return;

    try {
      const removeFunction = httpsCallable(functions, 'removePass');
      await removeFunction({
        passId: pass.id,
        passType: pass.type,
        userId: user.uid
      });

      // alert('Pass removed successfully!');
    } catch (error: any) {
      console.error('Error removing pass:', error);
      alert(`Failed to remove pass: ${error.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div>Loading passes...</div>;
  }

  return (
    <div className="my-pass-page">
      <MyPassCard className="main-content-card">
        <MyPassCardHeader title="My Passes" />
        <MyPassCardBody>
          <div className="pass-list-section">
            <h2>Market Passes</h2>
            <div className="pass-list">
              {marketPasses.length > 0 ? (
                marketPasses.map(pass => (
                  <MarketPassCard
                    key={pass.id}
                    pass={pass}
                    onAction={handleAction}
                    isUnlisting={unlistingPassId === pass.id}
                  />
                ))
              ) : (
                <p>No active market passes.</p>
              )}
            </div>
          </div>

          <div className="pass-list-section">
            <h2>Private Passes</h2>
            <div className="pass-list">
              {privatePasses.length > 0 ? (
                privatePasses.map(pass => <PrivatePassCard key={pass.id} pass={pass} onAction={handleAction} />)
              ) : (
                <p>No active private passes.</p>
              )}
            </div>
          </div>

          <div className="pass-list-section">
            <h2>Expired or Empty Passes</h2>
            <div className="pass-list">
              {expiredPasses.length > 0 ? (
                expiredPasses.map(pass => (
                  <ExpiredPassCard
                    key={pass.id}
                    pass={pass}
                    onAction={handleAction}
                  />
                ))
              ) : (
                <p>No expired passes.</p>
              )}
            </div>
          </div>
        </MyPassCardBody>
      </MyPassCard>

      {selectedPass && (
        <TransferPrivatePassModal
          isOpen={transferPrivateModalOpen}
          onClose={() => {
            setTransferPrivateModalOpen(false);
            setSelectedPass(null);
          }}
          pass={selectedPass}
          onTransferSuccess={handleTransferSuccess}
        />
      )}

      {selectedPass && (
        <SellMarketPassModal
          isOpen={sellMarketModalOpen}
          onClose={() => {
            setSellMarketModalOpen(false);
            setSelectedPass(null);
          }}
          pass={selectedPass}
          onTransferSuccess={handleTransferSuccess}
        />
      )}

      {selectedPass && selectedPass.type === 'private' && (
        <MarketModal
          isOpen={marketModalOpen}
          onClose={() => {
            setMarketModalOpen(false);
            setSelectedPass(null);
          }}
          pass={selectedPass}
          onSuccess={handleMarketSuccess}
        />
      )}
    </div>
  );
};

export default MyPassPage;