import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'

const PAGE_SIZE = 4

const actionLabels = {
  'venue.created': 'Venue created',
  'venue.updated': 'Venue updated',
  'venue_config.created': 'Venue configuration created',
  'venue_config.activated': 'Venue configuration activated',
  'venue_submission.viewed': 'Submission viewed',
  'venue_submission.manuscript_downloaded': 'Manuscript downloaded',
  'venue_submission.requirement_downloaded': 'Requirement file downloaded',
  'venue_submission.review_started': 'Editorial review started',
  'venue_submission.feedback_recorded': 'Editor feedback recorded',
  'venue_submission.decision_recorded': 'Human decision recorded',
  'venue_submission.retention_purged': 'Venue-retained content purged',
  'manuscript.retention_purged': 'Shared manuscript content purged',
  'analysis.semantic_unavailable': 'AI analysis incomplete',
  'legacy_submission.viewed': 'Legacy submission viewed',
  'legacy_submission.manuscript_downloaded': 'Legacy manuscript downloaded',
  'legacy_submission.decision_recorded': 'Legacy decision recorded',
  'legacy_submission.email_sent': 'Legacy email sent',
  'legacy_submission.deleted': 'Legacy submission deleted',
  'smtp.updated': 'SMTP configuration updated',
}

function shortId(value) {
  const text = String(value || '')
  return text ? (text.length > 18 ? text.slice(0, 8) + '...' + text.slice(-4) : text) : '—'
}

function labelAction(value) {
  return actionLabels[value] || String(value || '').replaceAll('_', ' ').replaceAll('.', ' · ')
}

function visualStatus(action) {
  const value = String(action || '').toLowerCase()

  if (value.includes('error') || value.includes('failed') || value.includes('failure')) {
    return {
      key: 'error',
      label: 'Error',
      wrap: 'border-red-200 bg-red-50 text-red-700',
      dot: 'bg-red-500',
    }
  }

  if (
    value.includes('deleted') ||
    value.includes('purged') ||
    value.includes('incomplete') ||
    value.includes('unavailable')
  ) {
    return {
      key: 'warning',
      label: 'Warning',
      wrap: 'border-amber-200 bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
    }
  }

  if (
    value.includes('created') ||
    value.includes('activated') ||
    value.includes('decision_recorded') ||
    value === 'smtp.updated'
  ) {
    return {
      key: 'success',
      label: 'Success',
      wrap: 'border-green-200 bg-green-50 text-green-700',
      dot: 'bg-green-500',
    }
  }

  return {
    key: 'info',
    label: 'Info',
    wrap: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getResourceSecondary(event) {
  if (event?.resource_type === 'venue_config') {
    const version =
      event?.detail?.version ??
      event?.detail?.config_version ??
      event?.detail?.venue_config_version

    if (version !== undefined && version !== null && version !== '') {
      return `v${String(version).replace(/^v/i, '')}`
    }
  }

  return shortId(event?.resource_id)
}

function getVenueContext(event) {
  return (
    event?.detail?.venue_name ||
    event?.detail?.venue ||
    event?.venue_name ||
    event?.venue_id ||
    ''
  )
}

function getOrganizationContext(event) {
  return (
    event?.detail?.organization_name ||
    event?.detail?.organization ||
    event?.organization_name ||
    event?.organization_id ||
    ''
  )
}

function getVersionContext(event) {
  return (
    event?.detail?.version ??
    event?.detail?.config_version ??
    event?.detail?.venue_config_version ??
    ''
  )
}

function getFallbackContext(event) {
  return (
    event?.detail?.fallback ||
    event?.detail?.fallback_mode ||
    event?.detail?.analysis_mode ||
    ''
  )
}

function getCoverageContext(event) {
  return (
    event?.detail?.coverage ??
    event?.detail?.coverage_percent ??
    event?.detail?.analysis_coverage?.coverage_percent ??
    ''
  )
}

function StatusBadge({ status }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-extrabold ${status.wrap}`}>
    <span className={`status-dot ${status.dot}`}></span>
    {status.label}
  </span>
}

export default function AuditLogPanel() {
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ q: '', action: '', severity: '' })
  const [applied, setApplied] = useState({ q: '', action: '', severity: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: '200' })
    if (applied.q.trim()) params.set('q', applied.q.trim())
    if (applied.action) params.set('action', applied.action)
    return params.toString()
  }, [applied.q, applied.action])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const payload = await api('/api/admin/audit-events/?' + query)
      setEvents(payload.events || [])
      setTotal(payload.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [applied.q, applied.action, applied.severity])

  function apply(e) {
    e.preventDefault()
    setApplied({ ...filters })
  }

  const visibleEvents = useMemo(
    () =>
      applied.severity
        ? events.filter(event => visualStatus(event.action).key === applied.severity)
        : events,
    [events, applied.severity],
  )

  const metrics = useMemo(() => {
    const counts = { success: 0, info: 0, warning: 0, error: 0 }

    events.forEach(event => {
      const key = visualStatus(event.action).key
      counts[key] = (counts[key] || 0) + 1
    })

    return counts
  }, [events])

  const displayTotal = applied.severity ? visibleEvents.length : total
  const loadedTotal = visibleEvents.length
  const pageCount = Math.max(1, Math.ceil(loadedTotal / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEvents = visibleEvents.slice(pageStart, pageStart + PAGE_SIZE)
  const shownStart = pageEvents.length ? pageStart + 1 : 0
  const shownEnd = pageEvents.length ? pageStart + pageEvents.length : 0

  const pageButtons = useMemo(() => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index + 1)
    }

    if (currentPage <= 2) return [1, 2, 3]
    if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount]

    return [currentPage - 1, currentPage, currentPage + 1]
  }, [currentPage, pageCount])

  function exportCsv() {
    const rows = [
      [
        'Timestamp',
        'Actor',
        'Role',
        'Action',
        'Status',
        'Resource type',
        'Resource ID',
        'Venue ID',
        'Submission ID',
        'Organization ID',
      ],
      ...visibleEvents.map(event => [
        event.occurred_at || '',
        event.actor_email || '',
        event.actor_role || '',
        event.action || '',
        visualStatus(event.action).label,
        event.resource_type || '',
        event.resource_id || '',
        event.venue_id || '',
        event.venue_submission_id || '',
        event.organization_id || '',
      ]),
    ]

    const csv = rows
      .map(row =>
        row
          .map(value => `"${String(value ?? '').replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'flexee-audit-log.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-[.15em] text-flexee-600">
          Production controls
        </div>

        <h2 className="serif mt-1 text-[43px] leading-none md:text-[54px]">
          Audit log
        </h2>

        <p className="mt-3 max-w-[850px] text-[16px] leading-7 text-muted">
          Structured, immutable records of editor access, administrative actions,
          configuration changes and system activity.
        </p>
      </div>

      <div className="premium-card min-w-[195px] rounded-[22px] px-5 py-4 text-right">
        <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">
          Recorded events
        </div>

        <div className="serif mt-1 text-[36px]">
          {loading ? '—' : total.toLocaleString()}
        </div>
      </div>
    </div>

    <form
      className="premium-card mb-5 grid gap-3 rounded-[24px] p-3 lg:grid-cols-[1.4fr_.7fr_.7fr_auto_auto]"
      onSubmit={apply}
    >
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7"/>
          <path d="m20 20-3.4-3.4"/>
        </svg>

        <input
          className="field pl-11"
          type="search"
          placeholder="Search actor, action, role, or resource ID..."
          value={filters.q}
          onChange={e => setFilters({ ...filters, q: e.target.value })}
        />
      </div>

      <select
        className="field"
        value={filters.action}
        onChange={e => setFilters({ ...filters, action: e.target.value })}
      >
        <option value="">All audited actions</option>
        {Object.entries(actionLabels).map(([value, label]) =>
          <option value={value} key={value}>{label}</option>
        )}
      </select>

      <select
        className="field"
        value={filters.severity}
        onChange={e => setFilters({ ...filters, severity: e.target.value })}
      >
        <option value="">All severity</option>
        <option value="success">Success</option>
        <option value="info">Information</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
      </select>

      <button
        className="rounded-2xl bg-flexee-500 px-5 py-3 text-[14px] font-extrabold text-white shadow-orange"
        type="submit"
      >
        Apply
      </button>

      <button
        className="rounded-2xl border border-line bg-white px-5 py-3 text-[14px] font-extrabold"
        type="button"
        onClick={() => {
          const cleared = { q: '', action: '', severity: '' }
          setFilters(cleared)
          setApplied(cleared)
        }}
      >
        Clear
      </button>
    </form>

    {error && <div className="admin-error mb-5">{error}</div>}

    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[22px] border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-green-700">
              Successful
            </div>
            <div className="mt-1 text-[30px] font-extrabold text-green-950">
              {loading ? '—' : metrics.success}
            </div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-100 text-[18px] font-black text-green-700">
            ✓
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-blue-700">
              Information
            </div>
            <div className="mt-1 text-[30px] font-extrabold text-blue-950">
              {loading ? '—' : metrics.info}
            </div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-[18px] font-black text-blue-700">
            i
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-amber-700">
              Warnings
            </div>
            <div className="mt-1 text-[30px] font-extrabold text-amber-950">
              {loading ? '—' : metrics.warning}
            </div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-[18px] font-black text-amber-700">
            !
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-red-700">
              Errors
            </div>
            <div className="mt-1 text-[30px] font-extrabold text-red-950">
              {loading ? '—' : metrics.error}
            </div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-[18px] font-black text-red-700">
            ×
          </div>
        </div>
      </div>
    </div>

    <div className="premium-card overflow-hidden rounded-[28px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-5">
        <div>
          <div className="text-[13px] font-extrabold uppercase tracking-[.08em] text-flexee-600">
            Event history
          </div>

          <h3 className="serif mt-1 text-[31px]">
            Recent activity
          </h3>
        </div>

        <button
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={exportCsv}
          disabled={!visibleEvents.length}
        >
          Export CSV
        </button>
      </div>

      <div className="thin-scroll overflow-x-auto">
        <table className="demo-audit-table min-w-[1220px] w-full border-collapse">
          <thead className="bg-[#faf7f4]">
            <tr className="border-b border-line">
              <th className="px-5 py-4 text-left text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">
                Timestamp
              </th>
              <th className="px-5 py-4 text-left text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">
                Actor
              </th>
              <th className="px-5 py-4 text-left text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">
                Action
              </th>
              <th className="px-5 py-4 text-left text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">
                Status
              </th>
              <th className="px-5 py-4 text-left text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">
                Resource
              </th>
              <th className="px-5 py-4 text-left text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">
                Context
              </th>
              <th className="px-5 py-4 text-right text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">
                Details
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {!loading && pageEvents.map(event => {
              const status = visualStatus(event.action)
              const venue = getVenueContext(event)
              const organization = getOrganizationContext(event)
              const version = getVersionContext(event)
              const fallback = getFallbackContext(event)
              const coverage = getCoverageContext(event)
              const semanticUnavailable = String(event.action || '').toLowerCase().includes('semantic_unavailable')

              return <tr key={event.id}>
                <td className="px-5 py-5 align-top">
                  <div className="text-[15px] font-extrabold">
                    {formatDate(event.occurred_at)}
                  </div>
                  <div className="mt-1 text-[14px] font-medium text-muted">
                    {formatTime(event.occurred_at)}
                  </div>
                </td>

                <td className="px-5 py-5 align-top">
                  <div className="break-words text-[15px] font-extrabold">
                    {event.actor_email || event.actor || 'System/unknown'}
                  </div>
                  <div className="mt-1 break-words text-[14px] font-medium text-muted">
                    {event.actor_role || '—'}
                  </div>
                </td>

                <td className="px-5 py-5 align-top">
                  <div className="text-[15px] font-bold">
                    {labelAction(event.action)}
                  </div>
                  <div className="mt-1 break-words text-[13px] font-medium text-muted">
                    {event.action}
                  </div>
                </td>

                <td className="px-5 py-5 align-top">
                  <StatusBadge status={status} />
                </td>

                <td className="px-5 py-5 align-top">
                  <div className="break-words text-[14px] font-bold">
                    {event.resource_type || '—'}
                  </div>
                  <div className="mt-1 break-words text-[13px] font-medium text-muted" title={event.resource_id || ''}>
                    {getResourceSecondary(event)}
                  </div>
                </td>

                <td className="px-5 py-5 align-top text-[14px] leading-6 text-muted">
                  {semanticUnavailable ? <>
                    <div>
                      <span className="font-bold text-ink">Fallback:</span>{' '}
                      {fallback || 'deterministic checks'}
                    </div>
                    <div>
                      <span className="font-bold text-ink">Coverage:</span>{' '}
                      {coverage === '' ? '0%' : String(coverage).includes('%') ? coverage : `${coverage}%`}
                    </div>
                  </> : event.resource_type === 'venue_config' && version !== '' ? <>
                    <div>
                      <span className="font-bold text-ink">Venue:</span>{' '}
                      {venue || shortId(event.venue_id)}
                    </div>
                    <div>
                      <span className="font-bold text-ink">Version:</span>{' '}
                      {version}
                    </div>
                  </> : <>
                    {venue && <div>
                      <span className="font-bold text-ink">Venue:</span>{' '}
                      {venue === event.venue_id ? shortId(venue) : venue}
                    </div>}
                    {organization && <div>
                      <span className="font-bold text-ink">Organization:</span>{' '}
                      {organization === event.organization_id ? shortId(organization) : organization}
                    </div>}
                    {!venue && !organization && <span>—</span>}
                  </>}
                </td>

                <td className="px-5 py-5 text-right align-top">
                  <details className="demo-audit-details inline-block text-left">
                    <summary className="inline-block cursor-pointer list-none rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-extrabold text-flexee-700">
                      View
                    </summary>
                    <pre>{JSON.stringify(event.detail || {}, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            })}

            {!loading && !pageEvents.length && <tr>
              <td colSpan="7" className="px-5 py-10 text-center text-[14px] font-medium text-muted">
                No audit events match these filters.
              </td>
            </tr>}

            {loading && <tr>
              <td colSpan="7" className="px-5 py-10 text-center text-[14px] font-medium text-muted">
                Loading audit events…
              </td>
            </tr>}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[14px] font-medium text-muted">
          Showing {shownStart.toLocaleString()}–{shownEnd.toLocaleString()} of {displayTotal.toLocaleString()} events
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold text-muted disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            onClick={() => setPage(value => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </button>

          {pageButtons.map(pageNumber => <button
            key={pageNumber}
            className={pageNumber === currentPage
              ? 'rounded-xl bg-ink px-4 py-2 text-[13px] font-extrabold text-white'
              : 'rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold'}
            type="button"
            onClick={() => setPage(pageNumber)}
          >
            {pageNumber}
          </button>)}

          <button
            className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            onClick={() => setPage(value => Math.min(pageCount, value + 1))}
            disabled={currentPage >= pageCount}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
}
