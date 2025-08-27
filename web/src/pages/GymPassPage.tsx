import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, Timestamp, getDoc, getDocs } from 'firebase/firestore';
import '../css/GymPassPage.css';

interface Pass {
  id: string;
  gymDisplayName: string;
  gymId: string;
  count: number;
  lastDay: Timestamp;
  purchasePrice?: number;
  purchaseCount?: number;
  username?: string;
  userRef?: any;
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

// Helper function to fetch username from userRef
const fetchUsername = async (userRef: any): Promise<string> => {
  if (!userRef) return 'Unknown';
  try {
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as { name?: string };
      return userData.name || 'Unknown';
    }
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

// Helper function to determine if a pass should be considered expired
// This matches the filtering logic used in MyPassPage
const isPassExpired = (pass: AnyPass): boolean => {
  const now = new Date();
  const isDateExpired = pass.lastDay.toDate().getTime() < now.getTime();

  if (pass.type === 'private') {
    // Private passes are expired if date expired OR count is 0
    return isDateExpired || pass.count === 0;
  } else {
    // Market passes are expired if date expired AND count > 0
    // (empty market passes are not shown in expired section)
    return isDateExpired && pass.count > 0;
  }
};

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

const PassCard: React.FC<{ pass: AnyPass }> = ({ pass }) => {
  const isExpired = isPassExpired(pass);

  return (
    <div className={`pass-card ${isExpired ? 'expired' : ''}`}>
      <div className={`pass-card-header ${pass.type === 'private' ? 'private-pass' : 'market-pass'} ${isExpired ? 'expired-pass' : ''}`}>
        <h3>{pass.passName}</h3>
      </div>
      <div className="pass-card-body">
        <p>Username: {pass.username || 'Unknown'}</p>
        {pass.type === 'private' ? (
          <p>Purchase Price: ${pass.purchasePrice}</p>
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
  const [gymDisplayName, setGymDisplayName] = useState<string>('');

  if (!userProfile?.isAdmin) {
    return (
      <div className="gym-pass-page">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  // Fetch gym display name
  useEffect(() => {
    const fetchGymDisplayName = async () => {
      if (!userProfile?.adminGym || !db) {
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
  }, [userProfile?.adminGym]);

  useEffect(() => {
    if (!user || !db || !userProfile) {
      return;
    }

    const privatePassQuery = query(collection(db, 'privatePass'), where('gymId', '==', userProfile?.adminGym), where('active', '==', true));
    const marketPassQuery = query(collection(db, 'marketPass'), where('gymId', '==', userProfile?.adminGym), where('active', '==', true));

    const unsubPrivate = onSnapshot(privatePassQuery, async snapshot => {
      const passesWithUsernames = await Promise.all(
        snapshot.docs.map(async doc => {
          const passData = doc.data();
          const username = await fetchUsername(passData.userRef);
          return { id: doc.id, ...passData, type: 'private', username } as PrivatePass;
        })
      );
      const active = passesWithUsernames.filter(p => !isPassExpired(p));
      const expired = passesWithUsernames.filter(p => isPassExpired(p));

      setPrivatePasses(active);
      setExpiredPasses(prev => [...prev.filter(p => p.type !== 'private'), ...expired]);
    });

    const unsubMarket = onSnapshot(marketPassQuery, async snapshot => {
      const passesWithUsernames = await Promise.all(
        snapshot.docs.map(async doc => {
          const passData = doc.data();
          const username = await fetchUsername(passData.userRef);
          return { id: doc.id, ...passData, type: 'market', username } as MarketPass;
        })
      );
      const active = passesWithUsernames.filter(p => !isPassExpired(p));
      const expired = passesWithUsernames.filter(p => isPassExpired(p));
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
      <MyPassCard className="main-content-card">
        <MyPassCardHeader title={`Gym ${gymDisplayName || '[No Gym Assigned]'} Passes`} />
        <MyPassCardBody>
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
            <h2>Expired or Empty Passes</h2>
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
        </MyPassCardBody>
      </MyPassCard>
    </div>
  );
};

export default GymPassPage;