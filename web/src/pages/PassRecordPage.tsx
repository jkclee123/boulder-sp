import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import '../css/PassRecordPage.css';

interface PassRecordRecord {
  id: string;
  createdAt: Timestamp;
  gymDisplayName: string;
  gymId: string;
  passName: string;
  count: number;
  price: number;
  fromUserRef: any;
  toUserRef: any;
  action: 'transfer' | 'consume' | 'sell_admin';
  participants: [string, string];
  fromUserName?: string;
  toUserName?: string;
}

// --- Helper Components ---

const PassRecordCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`pass-record-card ${className || ''}`}>{children}</div>
);

const PassRecordCardHeader = ({ title, subtitle, children }: {
  title: string,
  subtitle?: string,
  children?: React.ReactNode
}) => (
  <div className="pass-record-card-header">
    <div className="header-content">
      <h2>{title}</h2>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    <div>{children}</div>
  </div>
);

const PassRecordCardBody = ({ children }: { children: React.ReactNode }) => (
  <div className="pass-record-card-body">{children}</div>
);



const formatCurrency = (amount: number): string => {
  return `HK$${amount.toLocaleString('en-HK')}`;
};

const PassRecordItem: React.FC<{ record: PassRecordRecord; currentUserId: string }> = ({ record, currentUserId }) => {
  const isFromUser = record.participants[0] === currentUserId;

  const getActionIcon = () => {
    switch (record.action) {
      case 'transfer': return '↔️';
      case 'consume': return '🔥';
      case 'sell_admin': return '💰';
      default: return '📋';
    }
  };

  const getCompactDescription = () => {
    switch (record.action) {
      case 'transfer':
        if (isFromUser) {
          return `to ${record.toUserName || 'user'}`;
        } else {
          return `from ${record.fromUserName || 'user'}`;
        }
      case 'consume':
        return `consumed`;
      case 'sell_admin':
        if (isFromUser) {
          return `Sold`;
        } else {
          return `Bought`;
        }
      default:
        return record.action;
    }
  };

  const getPriceDisplay = () => {
    if (record.action === 'consume') {
      return '---';
    }
    return formatCurrency(record.price);
  };

  const getPriceColorClass = () => {
    switch (record.action) {
      case 'transfer':
        // Green if receiving (money coming in), Red if sending (money going out)
        return isFromUser ? 'price-green' : 'price-red';
      case 'sell_admin':
        // Green if buying (receiving passes), Red if selling (giving passes)
        return isFromUser ? 'price-green' : 'price-red';
      case 'consume':
        // Red for consuming (money spent)
        return 'price-red';
      default:
        return 'price-red';
    }
  };

  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="pass-record-item compact">
      <div className="pass-record-row-1">
        <span className="gym-name">{truncateText(record.gymDisplayName, 15)}</span>
        <span className="separator">•</span>
        <span className="pass-name">{truncateText(record.passName, 12)}</span>
      </div>
      <div className="pass-record-row-2">
        <span className="action-icon">{getActionIcon()}</span>
        <span className="action-description">{getCompactDescription()}</span>
        <span className="separator">•</span>
        <span className="pass-count">{record.count} punch{record.count > 1 ? 'es' : ''}</span>
        <span className="separator">•</span>
        <span className={`pass-price ${getPriceColorClass()}`}>{getPriceDisplay()}</span>
      </div>
      <div className="pass-record-row-3">
        <span className="datetime-icon">📅</span>
        <span className="datetime">{record.createdAt.toDate().toLocaleString()}</span>
      </div>
    </div>
  );
};

const PassRecordPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [passRecords, setPassRecords] = useState<PassRecordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    // Query for records where current user is either fromUser or toUser
    const passRecordQuery = query(
      collection(db, 'passRecord'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      passRecordQuery,
      async (snapshot) => {
        try {
          const records = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PassRecordRecord));

          // Fetch user names for display
          const enrichedRecords = await Promise.all(
            records.map(async (record) => {
              const [fromUserId, toUserId] = record.participants;

              // Get fromUser name
              let fromUserName = 'Unknown User';
              if (fromUserId !== user.uid) {
                try {
                  if (db) {
                    const fromUserDoc = await getDoc(doc(db, 'users', fromUserId));
                    if (fromUserDoc.exists()) {
                      fromUserName = fromUserDoc.data().name || 'Unknown User';
                    }
                  }
                } catch (err) {
                  console.error('Error fetching fromUser:', err);
                }
              } else {
                fromUserName = userProfile?.name || 'You';
              }

              // Get toUser name
              let toUserName = 'Unknown User';
              if (toUserId !== user.uid) {
                try {
                  if (db) {
                    const toUserDoc = await getDoc(doc(db, 'users', toUserId));
                    if (toUserDoc.exists()) {
                      toUserName = toUserDoc.data().name || 'Unknown User';
                    }
                  }
                } catch (err) {
                  console.error('Error fetching toUser:', err);
                }
              } else {
                toUserName = userProfile?.name || 'You';
              }

              return {
                ...record,
                fromUserName,
                toUserName
              };
            })
          );

          setPassRecords(enrichedRecords);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing pass records:', err);
          setError('Failed to load pass records');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching pass records:', err);
        setError('Failed to load pass records');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="pass-record-page">
        <PassRecordCard className="main-content-card">
          <PassRecordCardHeader title="Pass Records" subtitle="Your complete history of pass transactions" />
          <PassRecordCardBody>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your pass records...</p>
            </div>
          </PassRecordCardBody>
        </PassRecordCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pass-record-page">
        <PassRecordCard className="main-content-card">
          <PassRecordCardHeader title="Pass Records" subtitle="Your complete history of pass transactions" />
          <PassRecordCardBody>
            <div className="error-container">
              <p>{error}</p>
              <button
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </PassRecordCardBody>
        </PassRecordCard>
      </div>
    );
  }

  return (
    <div className="pass-record-page">
      <PassRecordCard className="main-content-card">
        <PassRecordCardHeader title="Pass Records" subtitle="Your complete history of pass transactions" />
        <PassRecordCardBody>
          {passRecords.length > 0 ? (
            <div className="pass-record-list">
              {passRecords.map(record => (
                <PassRecordItem
                  key={record.id}
                  record={record}
                  currentUserId={user?.uid || ''}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No Pass Records Yet</h3>
              <p>Your pass transaction history will appear here once you start transferring or consuming passes.</p>
            </div>
          )}
        </PassRecordCardBody>
      </PassRecordCard>
    </div>
  );
};

export default PassRecordPage;
