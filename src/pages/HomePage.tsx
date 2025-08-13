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

  const [hoveredId, setHoveredId] = useState<number | null>(null)

  return (
    <div className="container" style={{ display: 'grid', gap: 12 }}>
      <section
        className="filter"
        style={{ position: 'sticky', top: 64, zIndex: 20, padding: 12, marginBottom: 12 }}
        role="search"
      >
        <form className="grid grid-cols-1 gap-sm" aria-label="Filter items">
          <label>
            <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Gym</span>
            <select
              aria-label="Gym"
              value={selectedGym}
              onChange={e => setSelectedGym(e.target.value)}
              className="w-full"
              style={{ height: 40, borderRadius: 12, padding: '0 12px' }}
            >
              {gyms.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </form>
      </section>

      <section aria-labelledby="results-heading">
        <h2 id="results-heading" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Results</h2>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>No results</h3>
            <p className="muted" style={{ marginTop: 6 }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                className="chat-row animate-fade-in"
                style={{
                  transition: 'transform 150ms ease',
                  transform: hoveredId === item.id ? 'translateY(-2px)' : undefined,
                  animationDelay: `${idx * 40}ms`
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="chat-avatar" aria-hidden>{getInitials(item.gym)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <h3 className="chat-title" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.gym}</h3>
                    <a
                      href="https://t.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ height: 32, padding: '0 8px', fontSize: 12 }}
                      aria-label={`Open chat about ${item.name} at ${item.gym}`}
                    >
                      Chat
                    </a>
                  </div>
                  <div className="chat-subtitle" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span>${item.price.toFixed(2)} • {item.passesLeft} left</span>
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


