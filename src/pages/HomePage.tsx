import { useAuth } from '../providers/AuthProvider'
import { useMemo, useState } from 'react'

export default function HomePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')

  const passes = useMemo(() => {
    const gyms = ['Granite Peak', 'Crux Hall', 'Summit Works', 'Boulder Barn']
    const names = ['Day Pass', 'Evening Pass', '10 Punch Pass', 'Monthly Transfer']
    const base = Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      name: names[i % names.length],
      gym: gyms[i % gyms.length],
      price: 10 + (i % 5) * 5, // simple sample pricing
      passesLeft: 1 + (i % 8),
      remarks: i % 2 === 0 ? 'Valid this month, non-refundable' : 'Includes gear rental'
    }))
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(p =>
      [p.name, p.gym, p.remarks].some(v => v.toLowerCase().includes(q))
    )
  }, [query])

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>Home</h1>
        <p style={{ margin: 0, color: '#6B7280' }}>Browse items and use filters to narrow results.</p>
      </div>

      <div className="filter-bar" role="search">
        <div className="filter-row">
          <input
            className="filter-input"
            type="search"
            placeholder="Search passes..."
            aria-label="Search passes"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {user ? (
        <div className="list" role="list">
          {passes.map(pass => (
            <article key={pass.id} className="list-item" role="listitem">
              <div className="list-item-media" aria-hidden>
                <div className="media-thumb" />
              </div>
              <div className="list-item-body">
                <h3 className="pass-row1">{pass.name}</h3>
                <p className="pass-row2">
                  <span className="muted">{pass.gym}</span>
                  <span className="dot">•</span>
                  <span className="muted">{pass.remarks}</span>
                </p>
                <div className="pass-row3">
                  <span className="price">${pass.price.toFixed(2)}</span>
                  <span className="dot">•</span>
                  <span className="stock">{pass.passesLeft} left</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <p>You are not signed in. Use the Login button in the header.</p>
        </div>
      )}
    </div>
  )
}


