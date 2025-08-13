import { useMemo, useState } from 'react'

type PassItem = {
  id: number
  name: string
  gym: string
  price: number
  passesLeft: number
  updated: string // YYYY-MM-DD
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

export default function HomePage() {
  const baseGyms = ['Granite Peak', 'Crux Hall', 'Summit Works', 'Boulder Barn']
  const names = ['Day Pass', 'Evening Pass', '10 Punch Pass', 'Monthly Transfer']

  const allPasses: PassItem[] = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      name: names[i % names.length],
      gym: baseGyms[i % baseGyms.length],
      price: 10 + (i % 5) * 5,
      passesLeft: 1 + (i % 8),
      // spread some dates across the past two months
      updated: new Date(Date.now() - (i * 5 + (i % 3)) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [])

  const [selectedGym, setSelectedGym] = useState<string>('All gyms')

  const gyms = useMemo(() => ['All gyms', ...Array.from(new Set(allPasses.map(p => p.gym)))], [allPasses])

  const filtered = useMemo(() => {
    if (selectedGym === 'All gyms') return allPasses
    return allPasses.filter(p => p.gym === selectedGym)
  }, [allPasses, selectedGym])

  

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <section className="filter sticky-filter" role="search" style={{ marginBottom: 12 }}>
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
                background: 'var(--surface)'
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
        {filtered.length === 0 ? (
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
                <div className="chat-avatar" aria-hidden>{getInitials(item.gym)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <h3 className="chat-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.gym}</h3>
                    <a
                      href="https://t.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      aria-label={`Open chat about ${item.name} at ${item.gym}`}
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
                    <span>${item.price.toFixed(0)} • {item.passesLeft} left</span>
                    <span>Last updated {computeDaysAgo(item.updated)}</span>
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


