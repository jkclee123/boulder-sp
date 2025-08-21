import { useEffect, useMemo, useState } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'

type PassItem = {
  id: number
  gymDisplayName: string
  price: number
  count: number
  updatedAt: string // YYYY-MM-DD
  remarks?: string
}

function computeDaysAgo(isoDate: string): string {
  const now = new Date()
  const then = new Date(isoDate + 'T00:00:00Z')
  const msPerDay = 24 * 60 * 60 * 1000
  const diff = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msPerDay))
  if (diff === 0) return 'today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function MarketPage() {
  const [allPasses, setAllPasses] = useState<PassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) {
      setError('Firebase is not configured')
      setLoading(false)
      return
    }
    const q = query(collection(db, 'marketPass'), orderBy('updatedAt', 'desc'))
    const unsub = onSnapshot(q, snapshot => {
      const items: PassItem[] = snapshot.docs.map((doc, idx) => {
        const data = doc.data() as any
        
        // Handle updatedAt field
        const updatedAt = data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString().slice(0, 10)
          : typeof data.updatedAt === 'string'
            ? data.updatedAt
            : new Date().toISOString().slice(0, 10)
        
        // Handle lastDay field
        const lastDay = data.lastDay instanceof Timestamp
          ? data.lastDay.toDate().toISOString().slice(0, 10)
          : typeof data.lastDay === 'string'
            ? data.lastDay
            : new Date().toISOString().slice(0, 10)
        
        return {
          id: idx + 1,
          gymDisplayName: String(data.gymDisplayName || 'Unknown Gym'),
          price: Number(data.price || 0),
          count: Number(data.count || 0),
          updatedAt,
          remarks: data.remarks || '',
        }
      })
      setAllPasses(items)
      setLoading(false)
    }, err => {
      setError(err.message || 'Failed to load')
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const [selectedGym, setSelectedGym] = useState<string>('All gyms')

  const gyms = useMemo(() => ['All gyms', ...Array.from(new Set(allPasses.map(p => p.gymDisplayName)))], [allPasses])

  const filtered = useMemo(() => {
    if (selectedGym === 'All gyms') return allPasses
    return allPasses.filter(p => p.gymDisplayName === selectedGym)
  }, [allPasses, selectedGym])

  

  if (loading) {
    return <div className="container" style={{ padding: 16 }}>Loading...</div>
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <section className="sticky-filter" role="search" style={{ marginBottom: 12 }}>
        <form aria-label="Filter items" style={{ display: 'grid', gap: 8 }}>
          <label>
            <span className="sr-only">Gym</span>
            <select
              aria-label="Gym"
              value={selectedGym}
              onChange={e => setSelectedGym(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 12,
                padding: '0 12px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                boxSizing: 'border-box'
              }}
            >
              {gyms.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </form>
      </section>

      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className="sr-only">Results</h2>
        {error ? (
          <div className="filter" style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>Error</h3>
            <p className="chat-subtitle" style={{ marginTop: 6 }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="filter" style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>No results</h3>
            <p className="chat-subtitle" style={{ marginTop: 6 }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                className="chat-row animate-fade-in"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="chat-avatar" aria-hidden>{getInitials(item.gymDisplayName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <h3 className="chat-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.gymDisplayName}</h3>
                    <a
                      href="https://t.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'inline-block' }}
                      >
                        <path d="M22 2L11 13" />
                        <path d="M22 2L7 7l5 5 5 5 5-15Z" />
                      </svg>
                      Chat
                    </a>
                  </div>
                  <div className="chat-subtitle" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span>${item.price.toFixed(0)} • {item.count} left</span>
                    <span>Last updated {computeDaysAgo(item.updatedAt)}</span>
                    {item.remarks && <span>• {item.remarks}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}




