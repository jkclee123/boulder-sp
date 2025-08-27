import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import '../css/PassLogPage.css';

interface PassLogRecord {
  id: string;
  createdAt: Timestamp;
  gym: string;
  count: number;
  price: number;
  fromUserRef: any;
  toUserRef: any;
  action: 'transfer' | 'consume';
  participants: [string, string];
  fromUserName?: string;
  toUserName?: string;
}

// --- Helper Components ---

const PassLogCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`pass-log-card ${className || ''}`}>{children}</div>
);

const PassLogCardHeader = ({ title, subtitle, children }: {
  title: string,
  subtitle?: string,
  children?: React.ReactNode
}) => (
  <div className="pass-log-card-header">
    <div className="header-content">
      <h2>{title}</h2>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    <div>{children}</div>
  </div>
);

const PassLogCardBody = ({ children }: { children: React.ReactNode }) => (
  <div className="pass-log-card-body">{children}</div>
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

const PassLogItem: React.FC<{ record: PassLogRecord; currentUserId: string }> = ({ record, currentUserId }) => {
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
    <div className="pass-log-item">
      <div className="pass-log-header">
        <div className="pass-log-gym">{record.gym}</div>
        <div className={`pass-log-action ${getActionBadgeClass()}`}>{record.action}</div>
      </div>
      <div className="pass-log-body">
        <div className="pass-log-description">
          {getActionDescription()}
        </div>
        <div className="pass-log-details">
          <div className="pass-log-count">
            <span className="label">Count:</span> {record.count}
          </div>
          <div className="pass-log-price">
            <span className="label">Price:</span> {getPriceDisplay()}
          </div>
        </div>
      </div>
      <div className="pass-log-footer">
        <div className="pass-log-timestamp">
          {formatDate(record.createdAt)}
        </div>
      </div>
    </div>
  );
};

const PassLogPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [passLogs, setPassLogs] = useState<PassLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    // Query for records where current user is either fromUser or toUser
    const passLogQuery = query(
      collection(db, 'passLog'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      passLogQuery,
      async (snapshot) => {
        try {
          const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PassLogRecord));

          // Fetch user names for display
          const enrichedLogs = await Promise.all(
            logs.map(async (log) => {
              const [fromUserId, toUserId] = log.participants;

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
                ...log,
                fromUserName,
                toUserName
              };
            })
          );

          setPassLogs(enrichedLogs);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing pass logs:', err);
          setError('Failed to load pass logs');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching pass logs:', err);
        setError('Failed to load pass logs');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="pass-log-page">
        <PassLogCard className="main-content-card">
          <PassLogCardHeader title="Pass Records" subtitle="Your complete history of pass transactions" />
          <PassLogCardBody>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your pass records...</p>
            </div>
          </PassLogCardBody>
        </PassLogCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pass-log-page">
        <PassLogCard className="main-content-card">
          <PassLogCardHeader title="Pass Records" subtitle="Your complete history of pass transactions" />
          <PassLogCardBody>
            <div className="error-container">
              <p>{error}</p>
              <button
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </PassLogCardBody>
        </PassLogCard>
      </div>
    );
  }

  return (
    <div className="pass-log-page">
      <PassLogCard className="main-content-card">
        <PassLogCardHeader title="Pass Records" subtitle="Your complete history of pass transactions" />
        <PassLogCardBody>
          {passLogs.length > 0 ? (
            <div className="pass-log-list">
              {passLogs.map(record => (
                <PassLogItem
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
        </PassLogCardBody>
      </PassLogCard>
    </div>
  );
};

export default PassLogPage;
