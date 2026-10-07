import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'
import AdminModal, { KvTable } from './AdminModal.jsx'
import VenueTrustBadge from '../VenueTrust.jsx'

// Venue index, layer 1 (build plan step 2): the journal catalogue built from OpenAlex,
// Crossref and DOAJ. No AI. Records are "Listed" until their rules are read (step 4).

const PAGE_SIZE = 20
const FILTERS = [
  ['all', 'All'],
  ['crossref', 'Crossref'],
  ['no_crossref', 'No Crossref'],
  ['open_access', 'Open access'],
  ['doaj', 'In DOAJ'],
  ['linked', 'Linked'],
  ['not_checked', 'Not checked'],
  ['missing', 'Missing'],
]
const FILTER_HELP = {
  crossref: 'Registers DOIs with Crossref',
  no_crossref: 'Checked, and not found in Crossref',
  doaj: 'Listed in the Directory of Open Access Journals',
  linked: 'Matched to a live venue in Venue Agents',
  not_checked: 'Not yet checked against Crossref/DOAJ',
  missing: 'No longer returned by OpenAlex (kept, flagged)',
}

function pageButtons(current, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const set = new Set([1, pages, current - 1, current, current + 1].filter(n => n >= 1 && n <= pages))
  const sorted = [...set].sort((a, b) => a - b)
  const out = []
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push(`gap-${n}`)
    out.push(n)
  })
  return out
}

function when(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const today = new Date()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function count(value) {
  return typeof value === 'number' ? value.toLocaleString() : '—'
}

function Toast({ toast }) {
  if (!toast) return null
  const tone = toast.kind === 'error' ? 'border-red-200 text-red-700' : toast.kind === 'info' ? 'border-line text-ink' : 'border-green-200 text-green-800'
  return <div role="status" className={`fixed bottom-6 left-1/2 z-[95] max-w-[90vw] -translate-x-1/2 rounded-2xl border bg-white px-5 py-3 text-[14px] font-bold shadow-soft ${tone}`}>{toast.message}</div>
}

function Pill({ tone = 'neutral', title, children }) {
  const tones = {
    neutral: 'border-line bg-white text-muted',
    good: 'border-green-200 bg-green-50 text-green-700',
    copper: 'border-flexee-200 bg-flexee-50 text-flexee-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
  }
  return <span title={title} className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-extrabold ${tones[tone]}`}>{children}</span>
}

function Link({ href, children }) {
  if (!href) return <span className="text-muted">—</span>
  return <a href={href} target="_blank" rel="noopener noreferrer" className="break-all font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2">{children || href}</a>
}

function asVenue(item) {
  return { trust: { tier: item.trust?.tier, last_verified_at: item.trust?.last_verified_at } }
}

export default function VenueIndexPanel() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [subfield, setSubfield] = useState('')
  const [sort, setSort] = useState('title')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], counts: {}, filter_counts: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3800)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => { setPage(1) }, [filter, query, subfield, sort])

  const load = useCallback(async () => {
    const params = new URLSearchParams({ filter, page: String(page), page_size: String(PAGE_SIZE), sort })
    if (query.trim()) params.set('q', query.trim())
    if (subfield) params.set('subfield', subfield)
    try {
      const payload = await api(`/api/admin/venue-index/?${params}`)
      if (payload.pagination && payload.pagination.page !== page) setPage(payload.pagination.page)
      setData(payload)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter, page, query, subfield, sort])

  useEffect(() => {
    const timer = setTimeout(load, query ? 250 : 0)
    return () => clearTimeout(timer)
  }, [load, query])

  const run = data.last_run
  const runActive = ['queued', 'processing'].includes(run?.status)
  useEffect(() => {
    if (!runActive) return undefined
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [runActive, load])

  async function startRun(mode) {
    setBusy(mode)
    try {
      const result = await api('/api/admin/venue-index/run/', { method: 'POST', body: JSON.stringify({ mode }) })
      showToast(result.already_running ? 'An index run is already in progress.'
        : mode === 'enrich' ? 'Checking journals against Crossref and DOAJ in the background.'
          : 'Index refresh started in the background. You can keep working.', 'info')
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy('')
    }
  }

  async function toggleSchedule() {
    const enable = !data.schedule?.enabled
    setBusy('schedule')
    try {
      const result = await api('/api/admin/venue-index/schedule/', { method: 'POST', body: JSON.stringify({ enabled: enable }) })
      setData(d => ({ ...d, schedule: result.schedule }))
      showToast(enable ? 'Monthly refresh is on (1st of each month), with daily catch-up checks.' : 'Monthly refresh is off.', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy('')
    }
  }

  async function openDetails(id) {
    setDetail(null)
    setDetailLoading(true)
    try {
      setDetail((await api(`/api/admin/venue-index/${id}/`)).item)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  const counts = data.counts || {}
  const items = data.items || []
  const pagination = data.pagination || { page: 1, page_size: PAGE_SIZE, total: 0, pages: 1 }
  const shownStart = pagination.total ? (pagination.page - 1) * pagination.page_size + 1 : 0
  const shownEnd = Math.min(pagination.total, pagination.page * pagination.page_size)
  const schedule = data.schedule || {}
  const crossrefShare = counts.total ? Math.round(100 * (counts.crossref || 0) / counts.total) : 0

  return <div>
    <div className="text-[12px] font-extrabold uppercase tracking-[.15em] text-flexee-600">Venue index · layer 1</div>
    <div className="mt-0.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h1 className="serif text-[32px] leading-none md:text-[36px]">Venue Index</h1>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggleSchedule} disabled={busy === 'schedule'}
          title={schedule.enabled ? `Next refresh ${when(schedule.next_full_refresh)}` : 'Refresh the index on the 1st of each month'}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm hover:shadow-card disabled:opacity-60">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          Monthly refresh: {schedule.enabled ? 'On' : 'Off'}
          {schedule.enabled && <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true"></span>}
        </button>
        <button type="button" onClick={() => startRun('enrich')} disabled={Boolean(busy) || runActive}
          title="Check journals against Crossref and DOAJ that are due (never checked, or older than 30 days)"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60">
          {busy === 'enrich' ? 'Starting…' : 'Run due checks'}
        </button>
        <button type="button" onClick={() => startRun('full')} disabled={Boolean(busy) || runActive}
          className="shine inline-flex items-center gap-2 rounded-xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-70">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
          {runActive ? 'Import running…' : busy === 'full' ? 'Starting…' : 'Refresh index now'}
        </button>
      </div>
    </div>
    <p className="mb-3 mt-1 max-w-[920px] text-[14px] leading-6 text-muted">
      Journals in {data.profile?.label ? <b className="font-bold text-ink">{data.profile.label}</b> : 'the target fields'}, from OpenAlex, checked against Crossref and DOAJ. No AI is used. Every record is <b className="font-bold text-ink">Listed</b> until its rules are read; authors don't see this page.
    </p>

    {/* Coverage */}
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        ['Journals', count(counts.total), `${count(counts.missing)} flagged missing`],
        ['Crossref registered', count(counts.crossref), counts.total ? `${crossrefShare}% of the index` : ''],
        ['Open access · in DOAJ', `${count(counts.open_access)} · ${count(counts.doaj)}`, 'DOAJ checked for open-access titles'],
        ['Linked to live venues', count(counts.linked), `${count(counts.not_enriched)} not yet checked`],
      ].map(([label, value, note]) => <div key={label} className="premium-card rounded-[18px] px-4 py-3">
        <div className="text-[11.5px] font-extrabold uppercase tracking-[.07em] text-muted">{label}</div>
        <div className="serif mt-0.5 text-[28px] leading-none">{value}</div>
        {note && <div className="mt-1 text-[12px] font-medium text-muted">{note}</div>}
      </div>)}
    </div>

    {/* Last run */}
    <div className="premium-card mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[18px] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`status-dot ${run?.status === 'failed' ? 'bg-red-500' : runActive ? 'bg-amber-500' : run ? 'bg-green-500' : 'bg-stone-400'}`}></span>
        <span className="text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">Last run</span>
        <span className="text-[14px] font-bold">{run ? when(run.started_at || run.created_at) : 'Never'}</span>
      </div>
      {run && <div className="text-[14px]"><span className="text-muted">Status</span> <b className={`ml-1 ${run.status === 'failed' ? 'text-red-700' : runActive ? 'text-amber-700' : 'text-green-700'}`}>{run.status.charAt(0).toUpperCase() + run.status.slice(1)}</b>{run.mode === 'enrich' && <span className="ml-1 text-muted">(checks only)</span>}</div>}
      {run && run.mode === 'full' && <div className="text-[14px]"><span className="text-muted">Journals</span> <b className="ml-1">{run.created} new · {run.updated} refreshed</b> <span className="text-muted">· {count(run.out_of_scope)} outside scope skipped</span></div>}
      {run && <div className="text-[14px]"><span className="text-muted">Checked</span> <b className="ml-1">{count(run.enriched)}</b>{run.pending_after > 0 && <span className="text-muted"> · {count(run.pending_after)} still to check</span>}</div>}
      {run?.errors?.length > 0 && <button type="button" onClick={() => setShowErrors(v => !v)} className="text-[14px] font-extrabold text-flexee-700 underline decoration-flexee-200 underline-offset-2">{run.errors.length} problem{run.errors.length === 1 ? '' : 's'} · {showErrors ? 'hide' : 'show'}</button>}
      {run?.status === 'failed' && run.summary && <div className="basis-full text-[13px] font-semibold text-red-700">{run.summary}</div>}
      {run?.catalogue_method === 'keyword_search' && <div className="basis-full text-[13px] font-semibold text-amber-800">OpenAlex did not accept the subject filter, so this run used keyword searches with the same scope check. Missing journals are only flagged after a complete subject-filter pass.</div>}
      {showErrors && run?.errors?.length > 0 && <ul className="basis-full space-y-1 rounded-xl border border-line bg-[#fcfaf8] px-3 py-2 text-[13px]">
        {run.errors.map((entry, index) => <li key={index} className="break-words">
          <span className="mr-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-muted">{entry.source}</span><span className="text-muted">{entry.detail}</span>
        </li>)}
      </ul>}
    </div>

    <div className="mb-3 flex flex-wrap gap-2">
      {FILTERS.map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} title={FILTER_HELP[key]}
        className={`metric-chip inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-1.5 ${filter === key ? 'active' : ''}`}>
        <span className="serif text-[18px] leading-none">{count(data.filter_counts?.[key] ?? 0)}</span>
        <span className="text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">{label}</span>
      </button>)}
    </div>

    <div className="premium-card mb-4 grid gap-2 rounded-[18px] p-2 lg:grid-cols-[1.4fr_.8fr_.5fr]">
      <div className="relative">
        <svg className="search-icon text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>
        <input className="field field-compact field-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search journal, publisher, ISSN or subject…" aria-label="Search the index" />
      </div>
      <select className="field field-compact" aria-label="Filter by main subject" value={subfield} onChange={e => setSubfield(e.target.value)}>
        <option value="">All subjects</option>
        {(counts.by_field || []).map(entry => <option key={entry.name} value={entry.name}>{entry.name} ({entry.count})</option>)}
      </select>
      <select className="field field-compact" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
        <option value="title">Sort: title</option><option value="works">Sort: most published</option><option value="recent">Sort: newest in index</option>
      </select>
    </div>

    {error && <div className="admin-error venue-admin-message mb-3">{error}</div>}

    <div className="premium-card overflow-hidden rounded-[22px]">
      <div className="thin-scroll overflow-x-auto">
        <table className="data-table w-full min-w-[1040px] border-collapse">
          <thead className="bg-[#faf7f4]">
            <tr className="border-b border-line">
              {['Journal', 'Main subject', 'Crossref', 'Open access', 'Trust', 'Refreshed'].map(label => <th key={label} className="px-4 py-2.5 text-left text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">{label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? <tr><td colSpan="6" className="px-5 py-8 text-center text-[14px] font-semibold text-muted">Loading the index…</td></tr>
              : items.length ? items.map(item => <tr key={item.id} className="data-row" tabIndex={0}
                onClick={() => openDetails(item.id)} onKeyDown={e => { if (e.key === 'Enter') openDetails(item.id) }}>
                <td className="px-4 py-2.5 align-middle">
                  <div className="text-[15px] font-extrabold leading-snug">{item.title}</div>
                  <div className="text-[12px] font-medium text-muted">{item.publisher || 'Publisher not stated'}{item.issn_l ? ` · ISSN ${item.issn_l}` : ''}{item.country_code ? ` · ${item.country_code}` : ''}</div>
                  {item.missing_since && <div className="mt-1"><Pill tone="warn" title="No longer returned by OpenAlex. Kept and flagged.">Missing since {when(item.missing_since)}</Pill></div>}
                </td>
                <td className="px-4 py-2.5 align-middle text-[13px]">
                  <div className="font-bold">{item.primary_subfield || '—'}</div>
                  <div className="text-[12px] text-muted">{Math.round((item.scope_share || 0) * 100)}% of output in scope</div>
                </td>
                <td className="px-4 py-2.5 align-middle text-[13px]">
                  {item.crossref_registered === true ? <Pill tone="good">{item.crossref_first_year ? `DOIs since ${item.crossref_first_year}` : 'Registered'}</Pill>
                    : item.crossref_registered === false ? <Pill tone="warn">Not found</Pill>
                      : <span className="text-[12px] font-semibold text-muted">Not checked</span>}
                </td>
                <td className="px-4 py-2.5 align-middle">
                  <div className="flex flex-wrap gap-1">
                    {item.open_access ? <Pill tone="copper">Open access</Pill> : <span className="text-[12px] font-semibold text-muted">Subscription</span>}
                    {item.doaj_listed && <Pill tone="good" title="Listed in the Directory of Open Access Journals">DOAJ</Pill>}
                  </div>
                </td>
                <td className="px-4 py-2.5 align-middle">
                  <VenueTrustBadge venue={asVenue(item)} />
                  {item.venue && <div className="mt-0.5 text-[11.5px] font-semibold text-muted">Linked: {item.venue.name}</div>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 align-middle text-[13px] text-muted">{when(item.last_refreshed_at)}</td>
              </tr>)
                : <tr><td colSpan="6" className="px-5 py-10 text-center">
                  <div className="text-[12px] font-extrabold uppercase tracking-[.08em] text-flexee-600">{counts.total ? 'Nothing here' : 'Empty index'}</div>
                  <div className="mt-1 text-[15px] font-extrabold">{counts.total ? 'No journals match these filters.' : 'Click "Refresh index now" to import the journal catalogue.'}</div>
                </td></tr>}
          </tbody>
        </table>
      </div>
      {pagination.total > 0 && <div className="flex flex-col gap-3 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[13px] font-medium text-muted">Showing {shownStart.toLocaleString()}–{shownEnd.toLocaleString()} of {pagination.total.toLocaleString()} journal{pagination.total === 1 ? '' : 's'}</div>
        {pagination.pages > 1 && <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}
            className="rounded-xl border border-line bg-white px-4 py-1.5 text-[13px] font-extrabold text-muted disabled:cursor-not-allowed disabled:opacity-45">Previous</button>
          {pageButtons(pagination.page, pagination.pages).map(entry => typeof entry === 'string'
            ? <span key={entry} className="px-1 py-1.5 text-[13px] font-extrabold text-muted">…</span>
            : <button key={entry} type="button" onClick={() => setPage(entry)} aria-current={entry === pagination.page ? 'page' : undefined}
              className={entry === pagination.page ? 'rounded-xl bg-ink px-4 py-1.5 text-[13px] font-extrabold text-white' : 'rounded-xl border border-line bg-white px-4 py-1.5 text-[13px] font-extrabold'}>{entry}</button>)}
          <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.page + 1)}
            className="rounded-xl border border-line bg-white px-4 py-1.5 text-[13px] font-extrabold disabled:cursor-not-allowed disabled:opacity-45">Next</button>
        </div>}
      </div>}
      <div className="border-t border-line px-5 py-2.5 text-[13px] font-medium text-muted">Click a row for every source fact and link. "Refreshed" is when OpenAlex last returned the journal.</div>
    </div>

    <AdminModal open={Boolean(detail) || detailLoading} onClose={() => { setDetail(null); setDetailLoading(false) }} labelledBy="index-record-title" maxWidth="max-w-[1080px]">
      {!detail ? <div className="p-10 text-center text-[15px] font-semibold text-muted">Loading…</div> : <>
        <div className="sticky top-0 z-[5] border-b border-line bg-gradient-to-r from-white via-white to-flexee-50 px-6 py-4 pr-16">
          <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-flexee-600">Journal{detail.publisher ? ` · ${detail.publisher}` : ''}</div>
          <h3 id="index-record-title" className="serif mt-0.5 break-words text-[30px] leading-none">{detail.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VenueTrustBadge venue={asVenue(detail)} />
            {detail.missing_since && <Pill tone="warn">Missing from OpenAlex since {when(detail.missing_since)}</Pill>}
          </div>
        </div>
        <div className="grid gap-4 p-6 lg:grid-cols-2">
          <KvTable title="Catalogue (OpenAlex)" rows={[
            ['ISSNs', detail.issns?.length ? detail.issns.join(', ') : '—'],
            ['Country', detail.country_code || '—'],
            ['Publishing since', detail.first_publication_year ? `${detail.first_publication_year}${detail.last_publication_year ? ` (latest ${detail.last_publication_year})` : ''}` : '—'],
            ['Works · citations', `${count(detail.metrics?.works_count)} · ${count(detail.metrics?.cited_by_count)}`],
            ['h-index', count(detail.metrics?.h_index)],
            ['Core source (CWTS)', detail.metrics?.is_core === true ? 'Yes' : detail.metrics?.is_core === false ? 'No' : '—'],
            ['Subjects', (detail.subfields || []).map(s => `${s.name} ${Math.round(s.share * 100)}%`).join(' · ') || '—'],
            ['Homepage', <Link key="h" href={detail.homepage_url} />],
            ['OpenAlex record', <Link key="o" href={detail.openalex_url}>{detail.openalex_id}</Link>],
          ]} />
          <div className="space-y-4">
            <KvTable title="Crossref" rows={detail.crossref?.checked_at ? [
              ['Registered', detail.crossref.registered ? 'Yes' : 'Not found'],
              ...(detail.crossref.registered ? [
                ['DOIs', count(detail.crossref.total_dois)],
                ['First year with DOIs', detail.crossref.first_year || '—'],
                ['Publisher (Crossref)', detail.crossref.publisher || '—'],
              ] : []),
              ['ISSN checks', `${detail.issn_checks?.valid_checksums ? 'Valid checksums' : 'Checksum problem'}${detail.issn_checks?.crossref_agrees === true ? ' · Crossref agrees' : detail.issn_checks?.crossref_agrees === false ? ' · Crossref lists different ISSNs' : ''}`],
              ['Checked', when(detail.crossref.checked_at)],
            ] : [['Status', 'Not checked yet']]} />
            {(detail.open_access || detail.doaj?.checked_at) && <KvTable title="DOAJ" rows={detail.doaj?.checked_at ? [
              ['Listed', detail.doaj.listed ? 'Yes' : 'Not listed'],
              ...(detail.doaj.listed ? [
                ['Peer review', (detail.doaj.review_process || []).join(', ') || '—'],
                ['Review to publication', detail.doaj.publication_time_weeks ? `${detail.doaj.publication_time_weeks} weeks` : '—'],
                ['APC', detail.doaj.has_apc === false ? 'None' : (detail.doaj.apc_max || []).map(p => `${p.price} ${p.currency}`).join(', ') || (detail.doaj.has_apc ? 'Yes' : '—')],
                ['Author guidelines', <Link key="g" href={detail.doaj.guidelines_url} />],
                ['Aims and scope', <Link key="a" href={detail.doaj.aims_scope_url} />],
                ['Editorial board', <Link key="b" href={detail.doaj.board_url} />],
              ] : []),
              ['Checked', when(detail.doaj.checked_at)],
            ] : [['Status', 'Not checked yet']]} />}
            {detail.last_error && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">Last check problem: {detail.last_error}. It is retried in the next run.</div>}
          </div>
        </div>
      </>}
    </AdminModal>
    <Toast toast={toast} />
  </div>
}
