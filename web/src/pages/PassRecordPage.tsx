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

const formatDate = (timestamp: Timestamp): string => {
  const date = timestamp.toDate();
  // Convert to Hong Kong Time (UTC+8)
  const hkTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));

  return hkTime.toLocaleDateString('en-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' HKT';
};

const formatCurrency = (amount: number): string => {
  return `HK$${amount.toLocaleString('en-HK')}`;
};

const PassRecordItem: React.FC<{ record: PassRecordRecord; currentUserId: string }> = ({ record, currentUserId }) => {
  const isFromUser = record.participants[0] === currentUserId;

  const getActionDescription = () => {
    switch (record.action) {
      case 'transfer':
        if (isFromUser) {
          return `You transferred ${record.count} pass${record.count > 1 ? 'es' : ''} to ${record.toUserName || 'another user'}`;
        } else {
          return `${record.fromUserName || 'Another user'} transferred ${record.count} pass${record.count > 1 ? 'es' : ''} to you`;
        }
      case 'consume':
        if (isFromUser) {
          return `Your ${record.count} pass${record.count > 1 ? 'es' : ''} were consumed`;
        } else {
          return `You consumed ${record.count} pass${record.count > 1 ? 'es' : ''} from ${record.fromUserName || 'another user'}`;
        }
      default:
        return record.action;
    }
  };

  const getActionBadgeClass = () => {
    switch (record.action) {
      case 'transfer':
        return 'action-transfer';
      case 'consume':
        return 'action-consume';
      default:
        return '';
    }
  };

  const getPriceDisplay = () => {
    if (record.action === 'consume' || record.price === 0) {
      return 'Free';
    }
    return formatCurrency(record.price);
  };

  return (
    <div className="pass-record-item">
      <div className="pass-record-header">
        <div className="pass-record-gym">{record.gymDisplayName}</div>
        <div className={`pass-record-action ${getActionBadgeClass()}`}>{record.action}</div>
      </div>
      <div className="pass-record-body">
        <div className="pass-record-description">
          {getActionDescription()}
        </div>
        <div className="pass-record-details">
          <div className="pass-record-count">
            <span className="label">Count:</span> {record.count}
          </div>
          <div className="pass-record-price">
            <span className="label">Price:</span> {getPriceDisplay()}
          </div>
        </div>
      </div>
      <div className="pass-record-footer">
        <div className="pass-record-timestamp">
          {formatDate(record.createdAt)}
        </div>
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
