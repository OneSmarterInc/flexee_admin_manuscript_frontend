import React, { useEffect, useRef, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import VenueTrustBadge from '../components/VenueTrust.jsx'
import { api } from '../api.js'

// The author-facing journal index (build plan step 8). Every result carries who stands behind it
// (tier) and when it was last checked, so an editor-confirmed venue never looks like a listing.

const TIER_TABS = [
  ['', 'All'],
  ['claimed', 'Editor-confirmed'],
  ['verified_index', 'Checked from official pages'],
  ['listed', 'Listed only'],
]

export function journalPath(item) {
  return item.kind === 'venue' ? `/journals/v/${item.key}` : `/journals/i/${item.key}`
}

function ResultRow({ item }) {
  return <li className="m-0 list-none border-b border-line p-0 last:border-0">
    <button type="button" onClick={() => go(journalPath(item))}
      className="m-0 flex w-full cursor-pointer flex-col gap-2 border-0 bg-transparent px-5 py-4 text-left font-[inherit] transition hover:bg-[#fcfaf8] sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="text-[16px] font-extrabold leading-snug text-ink">{item.name}</div>
        <div className="mt-0.5 text-[13px] text-muted">
          {[item.venue_type, item.publisher, item.issn].filter(Boolean).join(' · ')}
        </div>
        {item.summary && <p className="mt-1.5 line-clamp-2 max-w-[760px] text-[13.5px] text-ink/80">{item.summary}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.subjects?.map(s => <span key={s} className="rounded-full border border-line bg-white px-2 py-0.5 text-[11.5px] font-bold text-muted">{s}</span>)}
          {item.open_access && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11.5px] font-bold text-green-800">Open access</span>}
          {item.open_calls > 0 && <span className="rounded-full border border-flexee-200 bg-flexee-50 px-2 py-0.5 text-[11.5px] font-bold text-flexee-700">{item.open_calls} open call{item.open_calls === 1 ? '' : 's'}</span>}
        </div>
      </div>
      <div className="shrink-0 sm:text-right"><VenueTrustBadge venue={item} /></div>
    </button>
  </li>
}

export default function JournalIndex() {
  const params = new URLSearchParams(window.location.search)
  const [q, setQ] = useState(params.get('q') || '')
  const [tier, setTier] = useState(params.get('tier') || '')
  const [openAccess, setOpenAccess] = useState(params.get('open_access') === '1')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      const query = new URLSearchParams({ page: String(page) })
      if (q.trim()) query.set('q', q.trim())
      if (tier) query.set('tier', tier)
      if (openAccess) query.set('open_access', '1')
      try {
        setData(await api(`/api/journals/?${query}`))
        setError('')
        const shown = new URLSearchParams()
        if (q.trim()) shown.set('q', q.trim())
        if (tier) shown.set('tier', tier)
        if (openAccess) shown.set('open_access', '1')
        window.history.replaceState({}, '', `/journals${shown.toString() ? `?${shown}` : ''}`)
      } catch (err) {
        setError('The journal index could not be loaded. Please try again in a moment.')
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer.current)
  }, [q, tier, openAccess, page])

  const counts = data?.counts || {}
  const total = data?.pagination?.total ?? 0
  const pages = data?.pagination?.pages ?? 1

  return <PublicationShell>
    <div className="wrap author-flow-page py-8">
      <section className="mb-5">
        <p className="kicker">Journal index</p>
        <h1 className="serif mt-1 text-[38px] leading-[1.05]">Find where to send your manuscript.</h1>
        <p className="mt-2 max-w-[760px] text-[15px] text-muted">
          Other finders tell you a journal looks topically close. Flexee checks whether your manuscript actually meets a
          journal&rsquo;s rules: article types, word limits, required items and open calls. Every journal shows who stands
          behind its details and when they were last checked.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-[13.5px] text-muted">
          <span><b className="text-ink">{counts.claimed ?? '—'}</b> editor-confirmed</span>
          <span><b className="text-ink">{counts.verified_index ?? '—'}</b> checked from official pages</span>
          <span><b className="text-ink">{counts.listed ?? '—'}</b> listed (rules not read yet)</span>
        </div>
      </section>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search journals</span>
          <input type="search" value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Search by journal, publisher, ISSN or subject"
            className="field w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px]" />
        </label>
        <label className="inline-flex items-center gap-2 text-[14px] font-bold">
          <input type="checkbox" checked={openAccess} onChange={e => { setOpenAccess(e.target.checked); setPage(1) }} />
          Open access only
        </label>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Who stands behind the details">
        {TIER_TABS.map(([key, label]) => <button key={key || 'all'} type="button" role="tab" aria-selected={tier === key}
          onClick={() => { setTier(key); setPage(1) }}
          className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-extrabold ${tier === key ? 'border-flexee-300 bg-flexee-50 text-flexee-800' : 'border-line bg-white text-muted hover:text-ink'}`}>
          {label}
        </button>)}
      </div>

      {error && <div className="admin-error venue-admin-message">{error}</div>}
      <section className="author-panel overflow-hidden p-0" aria-busy={loading}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3 text-[13px] text-muted">
          <span>{loading && !data ? 'Loading…' : `${total.toLocaleString()} journal${total === 1 ? '' : 's'}`}</span>
          <span className="hidden sm:inline">Live venues first, then listed journals by size</span>
        </div>
        {data?.items?.length ? <ul className="m-0 list-none p-0">{data.items.map(item => <ResultRow key={`${item.kind}-${item.key}`} item={item} />)}</ul>
          : !loading && <p className="px-5 py-8 text-center text-[14px] text-muted">No journals match. Try a shorter search.</p>}
      </section>

      {pages > 1 && <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Pages">
        <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-xl border border-line bg-white px-3 py-1.5 text-[13px] font-extrabold disabled:opacity-40">Previous</button>
        <span className="text-[13px] text-muted">Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="rounded-xl border border-line bg-white px-3 py-1.5 text-[13px] font-extrabold disabled:opacity-40">Next</button>
      </nav>}
    </div>
  </PublicationShell>
}
