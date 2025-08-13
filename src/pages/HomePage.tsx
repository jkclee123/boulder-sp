import { useAuth } from '../providers/AuthProvider'
import { useMemo, useState } from 'react'

export default function HomePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('recent')

  const items = useMemo(() => {
    const base = Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      title: `Sample item ${i + 1}`,
      subtitle: 'Short description goes here',
      category: ['Routes', 'Gyms', 'Setters'][i % 3]
    }))
    let next = base
    if (query) next = next.filter(it => it.title.toLowerCase().includes(query.toLowerCase()))
    if (category) next = next.filter(it => it.category === category)
    if (sort === 'popular') next = next.slice().reverse()
    return next
  }, [query, category, sort])

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>Home</h1>
        <p style={{ margin: 0, color: '#6B7280' }}>Browse items and use filters to narrow results.</p>
      </div>

      <div className="filter-bar" role="search">
        <div className="filter-row">
          <input className="filter-input" type="search" placeholder="Search..." aria-label="Search items" value={query} onChange={e => setQuery(e.target.value)} />
          <select className="filter-select" aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="Routes">Routes</option>
            <option value="Gyms">Gyms</option>
            <option value="Setters">Setters</option>
          </select>
          <select className="filter-select" aria-label="Sort by" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="popular">Most popular</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
      </div>

      {user ? (
        <div className="list" role="list">
          {items.map(item => (
            <article key={item.id} className="list-item" role="listitem">
              <div className="list-item-media" aria-hidden>
                <div className="media-thumb" />
              </div>
              <div className="list-item-body">
                <h3 className="list-item-title">{item.title}</h3>
                <p className="list-item-subtitle">{item.subtitle}</p>
              </div>
              <div className="list-item-meta">
                <span className="badge">{item.category}</span>
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


