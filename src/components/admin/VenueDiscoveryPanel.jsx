import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'
import AdminModal, { KvTable } from './AdminModal.jsx'

const INCONCLUSIVE = 'Latest check was inconclusive; showing the previous verified result.'
const TABS = [['new', 'New'], ['added', 'Added'], ['changed', 'Changed'], ['ignored', 'Ignored']]
const TYPE_LABEL = { journal: 'Journal', publisher: 'Publisher', conference: 'Conference' }

function formatChecked(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ value }) {
  const map = {
    accepting: ['Accepting', 'border-green-200 bg-green-50 text-green-700', 'bg-green-500'],
    unclear: ['Unclear', 'border-amber-200 bg-amber-50 text-amber-700', 'bg-amber-500'],
    closed: ['Closed', 'border-line bg-white text-muted', 'bg-stone-400'],
  }
  const [label, cls, dot] = map[value] || map.unclear
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-extrabold ${cls}`}>
    <span className={`status-dot !h-[7px] !w-[7px] ${dot}`}></span>{label}
  </span>
}

function ConfidenceBadge({ value }) {
  const [label, cls] = value >= 80 ? ['High', 'border-green-200 bg-green-50 text-green-700']
    : value >= 60 ? ['Medium', 'border-amber-200 bg-amber-50 text-amber-700']
      : ['Low', 'border-red-200 bg-red-50 text-red-700']
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-extrabold ${cls}`}>
    {label}<span className="font-semibold opacity-70">{value}</span>
  </span>
}

function ExternalLink({ href }) {
  if (!href) return <span className="text-muted">Not found</span>
  return <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-flexee-700 underline decoration-flexee-200 underline-offset-2 hover:text-flexee-900">{href}</a>
}

const notStated = <span className="text-muted">Not stated</span>
function List({ items }) {
  return items && items.length ? <ul className="list-disc space-y-0.5 pl-5">{items.map(item => <li key={item}>{item}</li>)}</ul> : notStated
}
function Pairs({ value }) {
  const entries = Object.entries(value || {})
  return entries.length ? <div className="space-y-0.5">{entries.map(([key, item]) => <div key={key}>
    <span className="text-muted">{key.replaceAll('_', ' ')}:</span> {Array.isArray(item) ? item.join(', ') : typeof item === 'object' && item ? JSON.stringify(item) : String(item)}
  </div>)}</div> : notStated
}

function Toast({ toast }) {
  if (!toast) return null
  const tone = toast.kind === 'error' ? 'border-red-200 text-red-700' : toast.kind === 'info' ? 'border-line text-ink' : 'border-green-200 text-green-800'
  return <div role="status" className={`fixed bottom-6 left-1/2 z-[95] max-w-[90vw] -translate-x-1/2 rounded-2xl border bg-white px-5 py-3 text-[14px] font-bold shadow-soft ${tone}`}>{toast.message}</div>
}

export default function VenueDiscoveryPanel({ onOpenVenue }) {
  const [tab, setTab] = useState('new')
  const [filters, setFilters] = useState({ q: '', type: '', acceptance: 'accepting' })
  const [data, setData] = useState({ items: [], counts: {}, last_run: null, settings: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})
  const [justAdded, setJustAdded] = useState({})
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3800)
  }, [])

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status: tab })
    if (filters.acceptance) params.set('acceptance', filters.acceptance)
    if (filters.type) params.set('type', filters.type)
    if (filters.q.trim()) params.set('q', filters.q.trim())
    try {
      const payload = await api(`/api/admin/venue-discovery/?${params}`)
      setData(payload)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tab, filters])

  useEffect(() => {
    const timer = setTimeout(load, filters.q ? 250 : 0)
    return () => clearTimeout(timer)
  }, [load, filters.q])

  // While a run is queued or processing, refresh every 5 seconds.
  const runActive = ['queued', 'processing'].includes(data.last_run?.status)
  useEffect(() => {
    if (!runActive) return undefined
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [runActive, load])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  async function runNow() {
    setBusy(b => ({ ...b, run: true }))
    try {
      const result = await api('/api/admin/venue-discovery/run/', { method: 'POST', body: '{}' })
      showToast(result.already_running ? 'A discovery run is already in progress.' : 'Discovery started. It runs in the background; you can keep working.', 'info')
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(b => ({ ...b, run: false }))
    }
  }

  async function openDetails(id) {
    setDetail(null)
    setDetailLoading(true)
    try {
      const result = await api(`/api/admin/venue-discovery/${id}/`)
      setDetail(result.item)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  async function addToVenueAgent(item) {
    setBusy(b => ({ ...b, [item.id]: 'adding' }))
    try {
      const result = await api(`/api/admin/venue-discovery/${item.id}/add-to-venue-agent/`, { method: 'POST', body: '{}' })
      const venueId = result.venue?.id
      setJustAdded(map => ({ ...map, [item.id]: venueId }))
      setDetail(current => current && current.id === item.id ? { ...current, discovery_status: 'added', added_venue_id: venueId } : current)
      showToast(result.already_added ? `${item.name} was already in Venue Agents.` : `✓ ${item.name} added to Venue Agents. It is active and available to authors.`)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(b => ({ ...b, [item.id]: null }))
    }
  }

  async function setIgnored(item, ignore) {
    setBusy(b => ({ ...b, [item.id]: ignore ? 'ignoring' : 'restoring' }))
    try {
      await api(`/api/admin/venue-discovery/${item.id}/${ignore ? 'ignore' : 'restore'}/`, { method: 'POST', body: '{}' })
      showToast(ignore ? 'Ignored. You can restore it from the Ignored tab.' : 'Restored to New.', 'info')
      if (detail?.id === item.id) setDetail(null)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(b => ({ ...b, [item.id]: null }))
    }
  }

  function Actions({ item, inModal = false }) {
    const addedVenueId = justAdded[item.id] || item.added_venue_id
    const state = busy[item.id]
    if (addedVenueId || ['added', 'changed'].includes(item.discovery_status)) {
      return <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="whitespace-nowrap text-[13px] font-extrabold text-green-700">✓ Added to Venue Agents</span>
        {addedVenueId && <button type="button" onClick={e => { e.stopPropagation(); onOpenVenue?.(addedVenueId) }}
          className="whitespace-nowrap rounded-xl border border-line bg-white px-3 py-1.5 text-[12px] font-extrabold shadow-sm hover:shadow-card">Open Venue Agent</button>}
      </div>
    }
    if (item.discovery_status === 'ignored') {
      return <button type="button" disabled={Boolean(state)} onClick={e => { e.stopPropagation(); setIgnored(item, false) }}
        className="whitespace-nowrap rounded-xl border border-line bg-white px-3 py-1.5 text-[12px] font-extrabold shadow-sm disabled:opacity-60">
        {state === 'restoring' ? 'Restoring…' : 'Restore'}
      </button>
    }
    const closed = item.acceptance_status === 'closed'
    return <div className="flex items-center justify-end gap-2">
      <button type="button" disabled={Boolean(state)} onClick={e => { e.stopPropagation(); setIgnored(item, true) }}
        className="whitespace-nowrap rounded-xl border border-line bg-white px-3 py-1.5 text-[12px] font-extrabold text-muted shadow-sm hover:text-ink disabled:opacity-60">
        {state === 'ignoring' ? 'Ignoring…' : 'Ignore'}
      </button>
      <button type="button" disabled={Boolean(state) || closed} title={closed ? 'Closed to submissions' : undefined}
        onClick={e => { e.stopPropagation(); addToVenueAgent(item) }}
        className={`shine whitespace-nowrap rounded-xl bg-flexee-500 px-3 ${inModal ? 'py-2 text-[13px]' : 'py-1.5 text-[12px]'} font-extrabold text-white shadow-orange hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-50`}>
        {state === 'adding' ? 'Adding…' : 'Add to Venue Agent'}
      </button>
    </div>
  }

  const run = data.last_run
  const settings = data.settings || {}
  const counts = data.counts || {}
  const items = data.items || []
  const hidden = data.hidden_by_status_filter || 0

  return <div>
    <div className="text-[12px] font-extrabold uppercase tracking-[.15em] text-flexee-600">Editorial intelligence</div>
    <div className="mt-0.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h2 className="serif text-[32px] leading-none md:text-[36px]">Venue Discovery</h2>
      <button type="button" onClick={runNow} disabled={busy.run || runActive}
        className="shine inline-flex items-center gap-2 rounded-xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-70">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>
        {runActive ? 'Discovery running…' : busy.run ? 'Starting…' : 'Run discovery now'}
      </button>
    </div>
    <p className="mb-3 mt-1 max-w-[900px] text-[14px] leading-6 text-muted">
      Each day an AI agent searches the public web for journals, publishers and conferences, reads their official author pages, and every claim is checked against those pages. Nothing here is visible to authors until you add it to Venue Agents.
    </p>

    {!loading && (!settings.enabled || !settings.search_configured) && <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] font-semibold text-amber-800">
      {!settings.enabled
        ? <>Discovery is turned off on the server. Set <code>VENUE_DISCOVERY_ENABLED=true</code> to enable it.</>
        : <>The discovery agent can't run yet: set <code>{settings.missing_key || 'ANTHROPIC_API_KEY'}</code> on the server.</>}
    </div>}

    <div className="premium-card mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[18px] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`status-dot ${run?.status === 'failed' ? 'bg-red-500' : runActive ? 'bg-amber-500' : run ? 'bg-green-500' : 'bg-stone-400'}`}></span>
        <span className="text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">Last run</span>
        <span className="text-[14px] font-bold">{run ? formatChecked(run.started_at || run.created_at) : 'Never'}</span>
      </div>
      {run && <div className="text-[14px]"><span className="text-muted">Status</span> <b className={`ml-1 ${run.status === 'failed' ? 'text-red-700' : runActive ? 'text-amber-700' : 'text-green-700'}`}>{run.status.charAt(0).toUpperCase() + run.status.slice(1)}</b></div>}
      {run && !runActive && <div className="text-[14px]"><span className="text-muted">Found</span> <b className="ml-1">{run.candidates_created} new · {run.candidates_updated} updated · {run.candidates_changed} changed</b></div>}
      {run && !runActive && <div className="text-[14px]"><span className="text-muted">Searches · pages read</span> <b className="ml-1">{run.queries_run} · {run.official_pages_checked}</b></div>}
      {run && !runActive && <div className="text-[14px]"><span className="text-muted">Skipped</span> <b className="ml-1">{run.error_count}</b></div>}
      {run?.status === 'failed' && <div className="text-[13px] font-semibold text-red-700">{run.summary}</div>}
      <div className="ml-auto text-[13px] font-semibold text-muted">Runs daily · {settings.mode === 'claude_agent' ? 'agent' : 'search'}: {settings.search_provider || '—'}</div>
    </div>

    <div className="mb-3 flex flex-wrap gap-2">
      {TABS.map(([key, label]) => <button key={key} type="button" onClick={() => { setTab(key); setLoading(true) }}
        className={`metric-chip inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-1.5 ${tab === key ? 'active' : ''}`}>
        <span className="serif text-[20px] leading-none">{counts[key] || 0}</span>
        <span className="text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">{label}</span>
      </button>)}
    </div>

    <div className="premium-card mb-4 grid gap-2 rounded-[18px] p-2 lg:grid-cols-[1.5fr_.7fr_.7fr]">
      <div className="relative">
        <svg className="search-icon text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>
        <input className="field field-compact field-search" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })}
          placeholder="Search venue, publisher, or subject..." />
      </div>
      <select className="field field-compact" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
        <option value="">All types</option><option value="journal">Journal</option><option value="publisher">Publisher</option><option value="conference">Conference</option>
      </select>
      <select className="field field-compact" value={filters.acceptance} onChange={e => setFilters({ ...filters, acceptance: e.target.value })}>
        <option value="accepting">Accepting</option><option value="">All statuses</option><option value="unclear">Unclear</option><option value="closed">Closed</option>
      </select>
    </div>

    {error && <div className="admin-error venue-admin-message mb-3">{error}</div>}

    <div className="premium-card overflow-hidden rounded-[22px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div>
          <div className="text-[12px] font-extrabold uppercase tracking-[.08em] text-flexee-600">
            {TABS.find(([key]) => key === tab)?.[1]}{filters.acceptance ? ` · ${filters.acceptance}` : ''}
          </div>
          <h3 className="serif mt-0.5 text-[24px] leading-none">Discovered venues</h3>
        </div>
        <div className="rounded-full border border-flexee-100 bg-flexee-50 px-3 py-1 text-[12px] font-extrabold text-flexee-700">{items.length} venue{items.length === 1 ? '' : 's'}</div>
      </div>
      <div className="thin-scroll overflow-x-auto">
        <table className="data-table w-full min-w-[1180px] border-collapse">
          <thead className="bg-[#faf7f4]">
            <tr className="border-b border-line">
              {['Venue', 'Type', 'Accepts', 'Status', 'Confidence'].map(label => <th key={label} className="px-4 py-2.5 text-left text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">{label}</th>)}
              <th className="px-4 py-2.5 text-left text-[12px] font-extrabold uppercase tracking-[.06em] text-muted" title="When this venue's official pages were last read">Last verified</th>
              <th className="px-4 py-2.5 text-right text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? <tr><td colSpan="7" className="px-5 py-8 text-center text-[14px] font-semibold text-muted">Loading discovered venues…</td></tr>
              : items.length ? items.map(item => <tr key={item.id} className="data-row" tabIndex={0}
                onClick={() => openDetails(item.id)}
                onKeyDown={e => { if (e.key === 'Enter') openDetails(item.id) }}>
                <td className="px-4 py-2.5 align-middle">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas text-flexee-600 serif">{(TYPE_LABEL[item.venue_type] || 'V')[0]}</div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-extrabold leading-snug">{item.name}</div>
                      <div className="text-[12px] font-medium text-muted">{item.organization_name || 'Organization not stated'}{item.source_domain && <> · <span className="text-flexee-700">{item.source_domain}</span></>}</div>
                      {item.discovery_status === 'changed' && <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">Update available</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 align-middle text-[14px] text-muted">{TYPE_LABEL[item.venue_type]}</td>
                <td className="px-4 py-2.5 align-middle">
                  <div className="flex max-w-[260px] flex-wrap gap-1">
                    {item.submission_type_labels.length ? item.submission_type_labels.map(label => <span key={label} className="rounded-full border border-flexee-100 bg-flexee-50 px-2 py-0.5 text-[12px] font-bold text-flexee-800">{label}</span>) : <span className="text-[13px] text-muted">Not stated</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 align-middle"><StatusBadge value={item.acceptance_status} /></td>
                <td className="px-4 py-2.5 align-middle"><ConfidenceBadge value={item.confidence} /></td>
                <td className="whitespace-nowrap px-4 py-2.5 align-middle text-[13px] text-muted" title="When this venue's official pages were last read">
                  {formatChecked(item.last_checked_at)}
                  {item.checked_in_last_run && <div className="mt-1"><span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-extrabold text-green-700">This run</span></div>}
                  {item.last_error === INCONCLUSIVE && <div className="mt-1 text-[11px] font-semibold text-amber-700" title={item.last_error}>Last check inconclusive</div>}
                </td>
                <td className="px-4 py-2.5 align-middle"><Actions item={item} /></td>
              </tr>)
                : <tr><td colSpan="7" className="px-5 py-10 text-center">
                  <div className="text-[12px] font-extrabold uppercase tracking-[.08em] text-flexee-600">Nothing here</div>
                  <div className="mt-1 text-[15px] font-extrabold">No discovered venues match these filters.</div>
                </td></tr>}
          </tbody>
        </table>
      </div>
      {hidden > 0 && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-[#fffaf6] px-5 py-2.5 text-[13px] font-semibold text-ink">
        <span>{hidden} more {TABS.find(([key]) => key === tab)?.[1].toLowerCase()} venue{hidden === 1 ? ' is' : 's are'} not {filters.acceptance} (unclear or closed).</span>
        <button type="button" onClick={() => setFilters({ ...filters, acceptance: '' })}
          className="rounded-xl border border-line bg-white px-3 py-1.5 text-[12px] font-extrabold shadow-sm hover:shadow-card">Show all statuses</button>
      </div>}
      <div className="border-t border-line px-5 py-2.5 text-[13px] font-medium text-muted">
        Rules shown are from the most recent verified check of each venue's official pages. "Last verified" is when that venue's pages were last read; "This run" marks venues the latest run looked at. Click a row for details and sources.
      </div>
    </div>

    <AdminModal open={Boolean(detail) || detailLoading} onClose={() => { setDetail(null); setDetailLoading(false) }} labelledBy="discovered-venue-title" maxWidth="max-w-[1120px]"
      footer={detail && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-[#fffdfb] px-6 py-3">
        {detail.discovery_status === 'new' && !justAdded[detail.id] && <span className="mr-auto text-[13px] font-medium text-muted">Adding creates the venue and its active configuration in one step. You can edit it later in Venue Agents.</span>}
        <Actions item={detail} inModal />
      </div>}>
      {!detail ? <div className="p-10 text-center text-[15px] font-semibold text-muted">Loading details…</div> : <>
        <div className="sticky top-0 z-[5] border-b border-line bg-gradient-to-r from-white via-white to-flexee-50 px-6 py-4 pr-16">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-flexee-600">Discovered {(TYPE_LABEL[detail.venue_type] || '').toLowerCase()}{detail.organization_name ? ` · ${detail.organization_name}` : ''}</div>
              <h3 id="discovered-venue-title" className="serif mt-0.5 break-words text-[30px] leading-none">{detail.name}</h3>
              <div className="mt-1.5 text-[13px] font-medium text-muted">Last verified {formatChecked(detail.last_checked_at)} · first found {formatChecked(detail.first_discovered_at)}. Rules below come from the most recent verified check of the official pages.</div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2"><StatusBadge value={detail.acceptance_status} /><ConfidenceBadge value={detail.confidence} /></div>
          </div>
        </div>

        {detail.change_summary && <div className="mx-6 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] font-semibold text-amber-800"><b>Update available.</b> {detail.change_summary}</div>}
        {detail.acceptance_status === 'unclear' && <div className="mx-6 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] font-semibold text-amber-800"><b>Not verified as accepting.</b> The official pages don't clearly show an open submission route. Check before adding.</div>}
        {detail.acceptance_status === 'closed' && <div className="mx-6 mt-4 rounded-2xl border border-line bg-[#fcfaf8] px-4 py-3 text-[14px] font-semibold text-muted"><b>Closed to submissions.</b> It can't be added while closed; the daily check will update it if it reopens.</div>}
        {detail.last_error && <div className="mx-6 mt-4 rounded-2xl border border-line bg-[#fcfaf8] px-4 py-3 text-[13px] font-semibold text-muted">
          {detail.last_error === INCONCLUSIVE ? INCONCLUSIVE : <>The latest re-check could not complete ({detail.last_error}). Showing the previous verified result.</>}
        </div>}

        <div className="grid gap-3 px-6 pt-4 lg:grid-cols-2">
          <KvTable title="Venue" rows={[
            ['Organization', detail.organization_name || notStated],
            ['Type', TYPE_LABEL[detail.venue_type]],
            ['Website', <ExternalLink href={detail.website_url} />],
            ['Submission page', <ExternalLink href={detail.submission_url} />],
            ['Accepted submissions', detail.submission_type_labels.join(', ') || notStated],
          ]} />
          <KvTable title="Review rules" rows={[
            ['Article / book types', <List items={detail.article_types} />],
            ['Accepted methods', <List items={detail.accepted_methods} />],
            ['Quality threshold', detail.quality_threshold || notStated],
            ['Reviewer criteria', <List items={detail.reviewer_criteria} />],
            ['Reporting standards', <List items={detail.reporting_standards} />],
          ]} />
        </div>
        <div className="px-6 pt-3"><KvTable title="Aims & scope" rows={[['Scope', detail.aims_scope || notStated], ['Description', detail.description || notStated]]} /></div>
        <div className="grid gap-3 px-6 pt-3 lg:grid-cols-2">
          <KvTable title="Submission requirements" rows={[
            ['Required items', detail.required_submission_items?.length ? <ul className="space-y-1">{detail.required_submission_items.map(entry => <li key={entry.key} className="flex items-center justify-between gap-2">
              <span>{entry.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${entry.required ? 'bg-flexee-50 text-flexee-700' : 'bg-stone-100 text-muted'}`}>{entry.type} · {entry.required ? 'required' : 'optional'}</span>
            </li>)}</ul> : notStated],
            ['Disclosures', <List items={detail.disclosures} />],
            ['Deadlines', <Pairs value={detail.deadlines} />],
          ]} />
          <KvTable title="Policies & rules" rows={[
            ['Policies', <Pairs value={detail.policies} />],
            ['Desk-rejection guidance', <List items={detail.desk_rejection_rules} />],
            ['Automatic rules', detail.structured_desk_rejection_rules?.length
              ? <div className="space-y-0.5">{detail.structured_desk_rejection_rules.map((rule, index) => <div key={index}>{rule.field.replaceAll('_', ' ')} {rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : Number(rule.value).toLocaleString()} <span className="text-muted">— {rule.message}</span></div>)}</div>
              : <span className="text-muted">None (only clear, objective rules become automatic)</span>],
            ['Current demand', <Pairs value={detail.current_demand} />],
          ]} />
        </div>
        <div className="px-6 py-4">
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line bg-[#faf7f4] px-4 py-2 text-[12px] font-extrabold uppercase tracking-[.08em] text-flexee-600">Source evidence</div>
            {detail.source_evidence?.length ? detail.source_evidence.map((entry, index) => <div key={index} className="border-b border-line px-4 py-3 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{entry.field.replaceAll('_', ' ')}</span>
                <b className="text-[14px]">{entry.claim}</b>
              </div>
              {entry.excerpt && <blockquote className="mt-1.5 border-l-2 border-flexee-300 pl-3 text-[13px] italic text-muted">“{entry.excerpt}”</blockquote>}
              <div className="mt-1 text-[12px] font-semibold">{entry.source_title} · <ExternalLink href={entry.url} /></div>
            </div>) : <div className="px-4 py-3 text-[14px] text-muted">No verified evidence recorded for this venue.</div>}
          </div>
        </div>
      </>}
    </AdminModal>

    <Toast toast={toast} />
  </div>
}
