import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import '../css/GymPassPage.css';

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

const PassCard: React.FC<{ pass: AnyPass }> = ({ pass }) => {
  // Use UTC-preserving approach to match backend UTC handling
  const now = new Date();
  const isExpired = pass.lastDay.toDate().getTime() < now.getTime();

  return (
    <div className={`pass-card ${isExpired ? 'expired' : ''}`}>
      <div className={`pass-card-header ${pass.type === 'private' ? 'private-pass' : 'market-pass'} ${isExpired ? 'expired-pass' : ''}`}>
        <h3>{pass.passName}</h3>
      </div>
      <div className="pass-card-body">
        <p>Username: </p>
        {pass.type === 'private' && pass.purchasePrice && pass.purchaseCount && pass.purchaseCount > 0 ? (
          <p>Avg Price: ${(pass.purchasePrice / pass.purchaseCount).toFixed(2)}</p>
        ) : pass.type === 'market' ? (
          <p>Price: ${pass.price}</p>
        ) : null}
        <p>Remaining Punches: {pass.count}</p>
        <p>Expires: {pass.lastDay.toDate().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

const GymPassPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [privatePasses, setPrivatePasses] = useState<PrivatePass[]>([]);
  const [marketPasses, setMarketPasses] = useState<MarketPass[]>([]);
  const [expiredPasses, setExpiredPasses] = useState<AnyPass[]>([]);

  useEffect(() => {
    if (!user || !db || !userProfile) {
      return;
    }

    const privatePassQuery = query(collection(db, 'privatePass'), where('gymId', '==', userProfile?.adminGym), where('active', '==', true));
    const marketPassQuery = query(collection(db, 'marketPass'), where('gymId', '==', userProfile?.adminGym), where('active', '==', true));

    const unsubPrivate = onSnapshot(privatePassQuery, snapshot => {
      const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'private' } as PrivatePass));
      const now = new Date();
      const active = passes.filter(p => p.lastDay.toDate().getTime() >= now.getTime());
      const expired = passes.filter(p => p.lastDay.toDate().getTime() < now.getTime());
      
      setPrivatePasses(active);
      setExpiredPasses(prev => [...prev.filter(p => p.type !== 'private'), ...expired]);
    });

    const unsubMarket = onSnapshot(marketPassQuery, snapshot => {
      const passes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'market' } as MarketPass));
      // Use UTC-preserving approach to match backend UTC handling
      const now = new Date();
      const active = passes.filter(p => p.lastDay.toDate().getTime() >= now.getTime());
      const expired = passes.filter(p => p.lastDay.toDate().getTime() < now.getTime() && p.count > 0);
      setMarketPasses(active);
      setExpiredPasses(prev => [...prev.filter(p => p.type !== 'market'), ...expired]);
    });

    return () => {
      unsubPrivate();
      unsubMarket();
    };
  }, [user, userProfile]);




  return (
    <div className="gym-pass-page">
            <h1 className="page-header">Gym Passes</h1>

      <div className="pass-list-section">
        <h2>Private Passes</h2>
        <div className="pass-list">
          {privatePasses.length > 0 ? (
            privatePasses.map(pass => <PassCard key={pass.id} pass={pass} />)
          ) : (
            <p>No active private passes.</p>
          )}
        </div>
      </div>

      <div className="pass-list-section">
        <h2>Market Passes</h2>
        <div className="pass-list">
          {marketPasses.length > 0 ? (
            marketPasses.map(pass => (
              <PassCard
                key={pass.id}
                pass={pass}
              />
            ))
          ) : (
            <p>No active market passes.</p>
          )}
        </div>
      </div>

      <div className="pass-list-section">
        <h2>Expired Passes</h2>
        <div className="pass-list">
          {expiredPasses.length > 0 ? (
            expiredPasses.map(pass => (
              <PassCard
                key={pass.id}
                pass={pass}
              />
            ))
          ) : (
            <p>No expired passes.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GymPassPage;