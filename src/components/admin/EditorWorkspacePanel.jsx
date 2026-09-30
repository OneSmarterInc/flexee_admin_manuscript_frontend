import React, { useEffect, useMemo, useState } from 'react'
import { api, apiBlob } from '../../api.js'

const statusLabels = {
  submitted: 'Submitted',
  under_review: 'Under review',
  revision_requested: 'Revision requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  transferred: 'Transferred',
}

function StatusPill({ value }) {
  const styles = {
    accepted: 'border-green-200 bg-green-50 text-green-700',
    rejected: 'border-red-200 bg-red-50 text-red-700',
    revision_requested: 'border-amber-200 bg-amber-50 text-amber-700',
    under_review: 'border-blue-200 bg-blue-50 text-blue-700',
    submitted: 'border-flexee-100 bg-flexee-50 text-flexee-700',
  }
  const dots = {
    accepted: 'bg-green-500',
    rejected: 'bg-red-500',
    revision_requested: 'bg-amber-500',
    under_review: 'bg-blue-500',
    submitted: 'bg-flexee-500',
  }
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-extrabold ${styles[value] || 'border-line bg-white text-muted'}`}>
    <span className={`status-dot ${dots[value] || 'bg-stone-400'}`}></span>
    {statusLabels[value] || value || '—'}
  </span>
}

const queueLabels = {
  submitted: 'Submitted',
  under_review: 'In review',
  revision_requested: 'Revision',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  transferred: 'Transferred',
}

function QueuePill({ value }) {
  const styles = {
    accepted: 'border-green-200 bg-green-50 text-green-700',
    rejected: 'border-red-200 bg-red-50 text-red-700',
    revision_requested: 'border-amber-200 bg-amber-50 text-amber-700',
    under_review: 'border-blue-200 bg-blue-50 text-blue-700',
    submitted: 'border-flexee-100 bg-flexee-50 text-flexee-700',
  }
  return <span className={`rounded-full border px-2.5 py-1 text-[12px] font-extrabold ${styles[value] || 'border-line bg-white text-muted'}`}>
    {queueLabels[value] || statusLabels[value] || value || '—'}
  </span>
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, x => x.toUpperCase())
}

const venueRuleFeedbackFields = new Set([
  'aims_scope',
  'article_types',
  'accepted_methods',
  'quality_threshold',
  'reviewer_criteria',
  'disclosures',
  'reporting_standards',
  'desk_rejection_rules',
])
const venueRuleListFields = new Set([
  'article_types',
  'accepted_methods',
  'reviewer_criteria',
  'disclosures',
  'reporting_standards',
  'desk_rejection_rules',
])

function feedbackEditorValue(field, text) {
  if (!venueRuleFeedbackFields.has(field)) return text ? { note: text } : null
  if (venueRuleListFields.has(field)) {
    return String(text || '').split(/\r?\n|,/).map(item => item.trim()).filter(Boolean)
  }
  return String(text || '').trim()
}

function feedbackAgentValue(detail, field) {
  if (venueRuleFeedbackFields.has(field)) return detail?.venue_config?.[field] ?? null
  return detail?.editorial_brief?.[field] ?? null
}

function saveBlob(blob, disposition, fallback) {
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition || '')
  const filename = decodeURIComponent((match?.[1] || fallback || 'manuscript').replace(/"/g, ''))
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function BriefBlock({ label, value }) {
  if (!value) return null
  const summary = typeof value === 'string' ? value : value.summary || value.detail || ''
  if (!summary) return null
  return <article className="editor-brief-block">
    <span>{label}</span>
    <p>{summary}</p>
  </article>
}

export default function EditorWorkspacePanel({ platformSuperuser = false, memberships = [] }) {
  const [venues, setVenues] = useState([])
  const [filters, setFilters] = useState({ q: '', venue_id: '', status: '' })
  const [data, setData] = useState({ counts: {}, items: [] })
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [decision, setDecision] = useState('revision_requested')
  const [decisionNote, setDecisionNote] = useState('')
  const [feedbackField, setFeedbackField] = useState('outlet_fit')
  const [feedbackValue, setFeedbackValue] = useState('')
  const [feedbackReason, setFeedbackReason] = useState('')
  const [detailTab, setDetailTab] = useState('brief')

  const query = useMemo(() => {
    const params = new URLSearchParams({ scope: 'editor' })
    Object.entries(filters).forEach(([key, value]) => {
      if (String(value || '').trim()) params.set(key, value)
    })
    return params.toString()
  }, [filters])

  async function loadQueue() {
    setError('')
    try {
      const [queue, venuePayload] = await Promise.all([
        api(`/api/admin/venue-submissions/?${query}`),
        api('/api/admin/venues/'),
      ])
      setData(queue)
      setVenues(venuePayload.venues || [])
      if (selectedId && !queue.items?.some(item => item.id === selectedId)) {
        setSelectedId('')
        setDetail(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [query])

  async function openSubmission(id) {
    setSelectedId(id)
    setDetailLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = await api(`/api/admin/venue-submissions/${id}/`)
      setDetail(payload.submission)
      setDecisionNote('')
      setFeedbackValue('')
      setFeedbackReason('')
      setDetailTab('brief')
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function refreshDetail() {
    if (!selectedId) return
    const payload = await api(`/api/admin/venue-submissions/${selectedId}/`)
    setDetail(payload.submission)
  }

  async function startReview() {
    if (!selectedId || !canEditSelected) return
    setBusy('review')
    setError('')
    setSuccess('')
    try {
      await api(`/api/admin/venue-submissions/${selectedId}/start-review/`, {
        method: 'POST',
        body: '{}',
      })
      setSuccess('Editorial review started.')
      await Promise.all([refreshDetail(), loadQueue()])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function recordDecision(e) {
    e.preventDefault()
    if (!selectedId || !canEditSelected) return
    setBusy('decision')
    setError('')
    setSuccess('')
    try {
      await api(`/api/admin/venue-submissions/${selectedId}/decision/`, {
        method: 'POST',
        body: JSON.stringify({ decision, note: decisionNote }),
      })
      setSuccess(`${statusLabels[decision]} recorded as a human editorial decision.`)
      setDecisionNote('')
      await Promise.all([refreshDetail(), loadQueue()])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function recordFeedback(e) {
    e.preventDefault()
    if (!detail?.venue?.id || !selectedId || !canEditSelected) return
    setBusy('feedback')
    setError('')
    setSuccess('')
    try {
      const agentValue = feedbackAgentValue(detail, feedbackField)
      await api(`/api/admin/venues/${detail.venue.id}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({
          venue_submission_id: selectedId,
          assessment_field: feedbackField,
          agent_value: agentValue,
          editor_value: feedbackEditorValue(feedbackField, feedbackValue),
          reason: feedbackReason,
        }),
      })
      setSuccess('Editor feedback recorded for this venue only.')
      setFeedbackValue('')
      setFeedbackReason('')
      await refreshDetail()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function downloadRequirementFile(item) {
    if (!selectedId || !item?.key || !item?.file) return
    setBusy(`requirement-${item.key}`)
    setError('')
    try {
      const result = await apiBlob(
        `/api/admin/venue-submissions/${selectedId}/requirements/${encodeURIComponent(item.key)}/download/`,
      )
      saveBlob(result.blob, result.disposition, item.file.name)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function downloadManuscript() {
    if (!selectedId) return
    setBusy('download')
    setError('')
    try {
      const result = await apiBlob(`/api/admin/venue-submissions/${selectedId}/download/`)
      saveBlob(result.blob, result.disposition, detail?.manuscript?.manuscript_filename)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const selectedRole = memberships.find(
    item => String(item.organization_id) === String(detail?.venue?.organization?.id || ''),
  )?.role
  const canEditSelected = platformSuperuser || ['owner', 'editor'].includes(selectedRole)
  const decisionAllowed = canEditSelected && detail && ['submitted', 'under_review', 'revision_requested'].includes(detail.status)


  function exportQueue() {
    const rows = [
      ['Venue', 'Manuscript', 'Author', 'Email', 'Status', 'Submitted'],
      ...(data.items || []).map(item => [
        item.venue?.name || '',
        item.manuscript?.title || '',
        item.manuscript?.author_name || '',
        item.manuscript?.author_email || '',
        statusLabels[item.status] || item.status || '',
        item.submitted_at || item.created_at || '',
      ]),
    ]
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'flexee-editorial-queue.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const coverage = detail?.editorial_brief?.analysis_coverage || {}
  const coveragePercent = Number(coverage.coverage_percent || 0)
  const briefValue = (value, fallback = 'Semantic analysis unavailable') => {
    if (!value) return fallback
    if (typeof value === 'string') return value
    return value.summary || value.detail || fallback
  }

  return <div>
    <div className="text-[12px] font-extrabold uppercase tracking-[.15em] text-flexee-600">
      Venue editor workspace
    </div>
    <div className="mt-0.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h2 className="serif text-[32px] leading-none md:text-[36px]">
        Human editorial review
      </h2>

      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={exportQueue}
          disabled={!data.items?.length}
          className="rounded-xl border border-line bg-white/90 px-4 py-2.5 text-[13px] font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export queue
        </button>
        <button
          type="button"
          onClick={loadQueue}
          disabled={loading}
          className="shine rounded-xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange transition hover:-translate-y-0.5 hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh queue'}
        </button>
      </div>
    </div>
    <p className="mb-3 mt-1.5 max-w-[880px] text-[14px] leading-6 text-muted">
      Review manuscript context, venue-specific evidence and AI-prepared editorial intelligence before recording a final human decision.
    </p>

    {error && <div className="admin-error venue-admin-message mb-3">{error}</div>}
    {success && <div className="venue-admin-success venue-admin-message mb-3">{success}</div>}

    <div className="mb-3 flex flex-wrap gap-2">
      {[
        { status: '', label: 'Editorial queue', count: data.counts?.total, dot: 'bg-flexee-500' },
        { status: 'submitted', label: 'Submitted', count: data.counts?.submitted, dot: 'bg-flexee-400' },
        { status: 'under_review', label: 'Under review', count: data.counts?.under_review, dot: 'bg-blue-500' },
        { status: 'revision_requested', label: 'Revision', count: data.counts?.revision_requested, dot: 'bg-amber-500' },
        { status: 'accepted', label: 'Accepted', count: data.counts?.accepted, dot: 'bg-green-500' },
        { status: 'rejected', label: 'Rejected', count: data.counts?.rejected, dot: 'bg-red-500' },
      ].map(chip => <button
        type="button"
        key={chip.label}
        onClick={() => setFilters({...filters, status: chip.status})}
        className={`metric-chip inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-1.5 text-left ${filters.status === chip.status ? 'active' : ''}`}
      >
        <span className={`status-dot ${chip.dot}`}></span>
        <span className="serif text-[20px] leading-none">{chip.count || 0}</span>
        <span className="text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">{chip.label}</span>
      </button>)}
    </div>

    <div className="premium-card mb-4 grid gap-2 rounded-[18px] p-2 lg:grid-cols-[1.55fr_.75fr_.75fr_auto]">
      <div className="relative">
        <svg className="search-icon text-muted" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7"/>
          <path d="m20 20-3.4-3.4"/>
        </svg>
        <input
          className="field field-compact field-search"
          value={filters.q}
          onChange={e => setFilters({...filters, q:e.target.value})}
          placeholder="Search manuscript, author, email, or venue..."
        />
      </div>

      <select className="field field-compact" value={filters.venue_id} onChange={e => setFilters({...filters, venue_id:e.target.value})}>
        <option value="">All venues</option>
        {venues.map(venue => <option value={venue.id} key={venue.id}>{venue.name}</option>)}
      </select>

      <select className="field field-compact" value={filters.status} onChange={e => setFilters({...filters, status:e.target.value})}>
        <option value="">All editorial statuses</option>
        {Object.entries(statusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}
      </select>

      <button className="rounded-xl bg-ink px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-flexee-800" type="button" onClick={loadQueue}>
        Apply
      </button>
    </div>
    <div className="grid items-start gap-4 2xl:grid-cols-[410px_minmax(0,1fr)]">
      <aside className="sidebar-content-card premium-card h-fit self-start overflow-hidden rounded-[28px]">
        <div className="flex items-center justify-between border-b border-line px-5 py-5">
          <div>
            <h3 className="serif text-[30px] leading-none">Submission queue</h3>
            <div className="mt-1.5 text-[14px] font-medium text-muted">Prioritized editorial workload</div>
          </div>
          <div className="rounded-full border border-flexee-100 bg-flexee-50 px-3 py-1.5 text-[13px] font-extrabold text-flexee-700">
            {data.items?.length || 0} record{data.items?.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="thin-scroll max-h-[max(360px,calc(100vh_-_360px))] overflow-y-auto">
          {loading ? <div className="p-5 text-[14px] font-semibold text-muted">Loading editorial queue…</div> :
            data.items?.length ? data.items.map(item => {
              const submitted = item.submitted_at || item.created_at
              return <button
                type="button"
                key={item.id}
                className={`queue-row w-full border-b border-line px-5 py-5 text-left ${selectedId === item.id ? 'active' : ''}`}
                onClick={() => openSubmission(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[13px] font-extrabold uppercase tracking-[.08em] text-flexee-600">{item.venue?.name}</span>
                  <QueuePill value={item.status} />
                </div>
                <div className="mt-2 text-[17px] font-extrabold">{item.manuscript?.title}</div>
                <div className="mt-1 text-[14px] leading-5 text-muted">
                  {item.manuscript?.author_name}
                </div>
                <div className="mt-3 flex items-center justify-between text-[13px] font-semibold text-[#91857d]">
                  <span>{formatDate(submitted)}</span>
                  <span>{formatTime(submitted)}</span>
                </div>
              </button>
            }) : <div className="p-5">
              <div className="text-[13px] font-extrabold uppercase tracking-[.08em] text-flexee-600">Queue clear</div>
              <div className="mt-2 text-[16px] font-extrabold">No venue submissions match these filters.</div>
            </div>
          }
        </div>
      </aside>

      <article className="premium-card overflow-hidden rounded-[28px]">
        {!selectedId ? <div className="p-8 text-center">
          <div className="text-[13px] font-extrabold uppercase tracking-[.08em] text-flexee-600">Select a submission</div>
          <h3 className="serif mt-2 text-[30px]">The editorial brief, evidence, and decision tools will appear here.</h3>
        </div> : detailLoading || !detail ? <div className="p-8 text-center text-[15px] font-semibold text-muted">Loading editorial packet…</div> : <>
          <div className="border-b border-line bg-gradient-to-r from-white via-white to-flexee-50/75 px-6 py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-[13px] font-extrabold uppercase tracking-[.09em] text-flexee-600">
                  {detail.venue?.name} · Configuration v{detail.venue_config_version || '—'}
                </div>
                <h3 className="serif mt-1 text-[40px] leading-none">{detail.manuscript?.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px] font-medium text-muted">
                  <span>{detail.manuscript?.author_name}</span>
                  <span className="text-[#cbb8ad]">•</span>
                  <span>{pretty(detail.manuscript?.manuscript_type)}</span>
                  {detail.manuscript?.author_email && <>
                    <span className="text-[#cbb8ad]">•</span>
                    <span>{detail.manuscript.author_email}</span>
                  </>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusPill value={detail.status} />
                <button
                  className="rounded-2xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={downloadManuscript}
                  disabled={busy === 'download' || Boolean(detail.retention_purged_at)}
                >
                  {detail.retention_purged_at ? 'Manuscript expired' : busy === 'download' ? 'Downloading…' : 'Download manuscript'}
                </button>
                {canEditSelected && ['submitted', 'revision_requested'].includes(detail.status) && <button
                  className="shine rounded-2xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={startReview}
                  disabled={busy === 'review'}
                >
                  {busy === 'review' ? 'Starting…' : 'Start review'}
                </button>}
              </div>
            </div>
          </div>

          {detail.retention_purged_at && <div className="mx-6 mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700">
            Venue-retained manuscript content expired on {new Date(detail.retention_purged_at).toLocaleString()}. Editorial status and human decision metadata remain available.
          </div>}
          {!detail.retention_purged_at && detail.retention_expires_at && <div className="mx-6 mt-5 rounded-2xl border border-line bg-[#fcfaf8] px-4 py-3 text-[13px] font-semibold text-muted">
            Retention expiry: {new Date(detail.retention_expires_at).toLocaleString()}
          </div>}

          <div className="grid gap-3 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-line bg-[#fcfaf8] p-4">
              <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">Venue config</div>
              <div className="mt-1.5 text-[16px] font-extrabold">{detail.venue_config_version ? `v${detail.venue_config_version}` : '—'}</div>
            </div>
            <div className="rounded-2xl border border-line bg-[#fcfaf8] p-4">
              <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">Evidence items</div>
              <div className="mt-1.5 text-[16px] font-extrabold">{detail.evidence?.length || 0}</div>
            </div>
            <div className="rounded-2xl border border-line bg-[#fcfaf8] p-4">
              <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">Editorial brief</div>
              <div className="mt-1.5 text-[16px] font-extrabold">{detail.editorial_brief && Object.keys(detail.editorial_brief).length ? 'Prepared' : 'Pending'}</div>
            </div>
            <div className="rounded-2xl border border-line bg-[#fcfaf8] p-4">
              <div className="text-[13px] font-extrabold uppercase tracking-[.06em] text-muted">Coverage</div>
              <div className="mt-1.5 flex items-center gap-2 text-[16px] font-extrabold">
                {coveragePercent}%
                <span className={`status-dot ${coveragePercent >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              </div>
            </div>
          </div>

          <div className="px-6">
            <div className="flex gap-1 overflow-x-auto border-b border-line">
              {[
                ['brief','Editorial brief'],
                ['evidence','Evidence'],
                ['rules','Venue rules'],
                ['feedback','Agent feedback'],
                ['decision','Decision'],
              ].map(([value,label]) => <button
                type="button"
                key={value}
                className={`workspace-tab whitespace-nowrap px-4 py-3.5 text-[14px] font-extrabold ${detailTab === value ? 'active' : 'text-muted'}`}
                onClick={() => setDetailTab(value)}
              >{label}</button>)}
            </div>
          </div>

          <div className="p-6">
            {detailTab === 'brief' && <div className="space-y-5">
              <div className="rounded-[22px] border border-line bg-[#fffdfb] p-5">
                <div className="mb-4 text-[13px] font-extrabold uppercase tracking-[.1em] text-flexee-600">Manuscript</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-canvas p-4">
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-muted">Author</div>
                    <div className="mt-1.5 text-[14px] font-extrabold">{detail.manuscript?.author_name}</div>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-muted">Email</div>
                    <div className="mt-1.5 break-all text-[14px] font-extrabold">{detail.manuscript?.author_email || '—'}</div>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-muted">Co-authors</div>
                    <div className="mt-1.5 text-[14px] font-extrabold">{detail.manuscript?.coauthors || '—'}</div>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-muted">File</div>
                    <div className="mt-1.5 text-[14px] font-extrabold">{detail.retention_purged_at ? 'Expired under retention policy' : detail.manuscript?.manuscript_filename || '—'}</div>
                  </div>
                </div>

                {detail.manuscript?.abstract && <div className="mt-5">
                  <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-muted">Abstract</div>
                  <p className="mt-2 text-[16px] leading-7">{detail.manuscript.abstract}</p>
                </div>}
                {detail.manuscript?.disclosure && <div className="mt-4">
                  <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-muted">AI-use disclosure</div>
                  <p className="mt-2 text-[16px] leading-7">{detail.manuscript.disclosure}</p>
                </div>}
              </div>

              {detail.requirements?.configured && <div className="rounded-[22px] border border-line bg-[#fffdfb] p-5">
                <div className="mb-4 text-[13px] font-extrabold uppercase tracking-[.1em] text-flexee-600">Venue submission requirements</div>
                <div className="text-[18px] font-extrabold">{detail.requirements.complete ? 'All required venue items were completed.' : 'Some venue requirements are incomplete.'}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(detail.requirements.items || []).map(item => <div className="rounded-2xl border border-line bg-white p-4" key={item.key}>
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-flexee-600">{item.label}{item.required ? ' · Required' : ' · Optional'}</div>
                    {item.type === 'file' ? <>
                      <div className="mt-2 text-[14px] font-semibold">{item.file?.name || 'No file supplied.'}</div>
                      {item.file && <button className="mt-3 rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-extrabold" type="button" onClick={() => downloadRequirementFile(item)} disabled={busy === `requirement-${item.key}`}>
                        {busy === `requirement-${item.key}` ? 'Downloading…' : 'Download file'}
                      </button>}
                    </> : <div className="mt-2 text-[14px] leading-6 text-muted">{item.type === 'checkbox' ? (item.value ? 'Confirmed' : 'Not confirmed') : (item.value || 'No response supplied.')}</div>}
                  </div>)}
                </div>
              </div>}

              <div className="rounded-[24px] border border-flexee-100 bg-gradient-to-br from-[#fff9f4] via-white to-white p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="text-[13px] font-extrabold uppercase tracking-[.1em] text-flexee-600">AI-prepared editorial brief</div>
                    <h4 className="serif mt-1 text-[30px] leading-tight">{detail.editorial_brief?.editor_summary || 'No editorial summary is available.'}</h4>
                    <p className="mt-2 max-w-5xl text-[15px] leading-7 text-muted">
                      {detail.editorial_brief?.decision_authority || 'This brief is advisory. The system never makes the final editorial decision. Acceptance, revision and rejection remain human decisions.'}
                    </p>
                  </div>
                  {coveragePercent < 100 && <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] font-extrabold text-amber-700">Limited analysis</span>}
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <div className="mb-2 flex items-center justify-between text-[13px] font-extrabold">
                      <span className="uppercase tracking-[.06em] text-muted">Analysis coverage</span>
                      <span>{coverage.chunks_analyzed || 0} / {coverage.chunks_total || 0} chunks</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-flexee-500" style={{ width: `${Math.max(0, Math.min(100, coveragePercent))}%` }}></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-white p-4">
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-flexee-600">Outlet fit</div>
                    <div className="mt-1.5 text-[15px] font-semibold">{briefValue(detail.editorial_brief?.outlet_fit)}</div>
                  </div>

                  <div className="rounded-2xl border border-line bg-white p-4">
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-flexee-600">Contribution</div>
                    <div className="mt-1.5 text-[15px] font-semibold">{briefValue(detail.editorial_brief?.contribution)}</div>
                  </div>

                  <div className="rounded-2xl border border-line bg-white p-4">
                    <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-flexee-600">Methods</div>
                    <div className="mt-1.5 text-[15px] font-semibold">{briefValue(detail.editorial_brief?.methods)}</div>
                  </div>
                </div>

                {detail.editorial_brief?.reviewer_expertise?.length > 0 && <div className="mt-5">
                  <div className="mb-2 text-[13px] font-extrabold uppercase tracking-[.05em] text-muted">Suggested reviewer expertise</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.editorial_brief.reviewer_expertise.map(item => <span key={item} className="rounded-full border border-flexee-100 bg-flexee-50 px-3 py-2 text-[13px] font-bold text-flexee-800">{item}</span>)}
                  </div>
                </div>}

                {detail.editorial_brief?.unresolved_risks?.length > 0 && <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <div className="text-[13px] font-extrabold uppercase tracking-[.05em] text-amber-700">Unresolved risks</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-6 text-amber-900">
                    {detail.editorial_brief.unresolved_risks.map((item,index) => <li key={index}>{typeof item === 'string' ? item : item.risk || JSON.stringify(item)}</li>)}
                  </ul>
                </div>}
              </div>
            </div>}

            {detailTab === 'evidence' && (detail.evidence?.length ? <div className="rounded-[22px] border border-line bg-white p-5">
              <div className="text-[13px] font-extrabold uppercase tracking-[.1em] text-flexee-600">Evidence trail</div>
              <h3 className="serif mt-1 text-[28px]">Findings linked to manuscript, venue policy, or verified sources</h3>
              <div className="mt-4 grid gap-3">
                {detail.evidence.map(item => <article key={item.id} className="rounded-2xl border border-line bg-[#fcfaf8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <b className="text-[15px]">{pretty(item.finding_type)}</b>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[12px] font-extrabold text-muted">{pretty(item.source_type)}</span>
                  </div>
                  <p className="mt-2 text-[15px] leading-7 text-muted">{item.claim}</p>
                  <small className="text-[13px] text-muted">{item.source_locator || 'No locator'}{item.source_url ? ` · ${item.source_url}` : ''}</small>
                  {item.excerpt && <blockquote className="mt-3 border-l-2 border-flexee-500 pl-3 text-[14px] leading-6 text-muted">{item.excerpt}</blockquote>}
                </article>)}
              </div>
            </div> : <div className="rounded-[22px] border border-line bg-white p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-flexee-50 text-flexee-600">
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 5h16v14H4z"/>
                  <path d="M8 9h8M8 13h5"/>
                </svg>
              </div>
              <h4 className="mt-4 text-[19px] font-extrabold">No evidence items available</h4>
              <p className="mx-auto mt-2 max-w-lg text-[15px] leading-7 text-muted">This submission currently contains deterministic review output only.</p>
            </div>)}

            {detailTab === 'rules' && <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-line bg-white p-5">
                <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-flexee-600">Accepted article types</div>
                <div className="mt-2 text-[16px] font-extrabold">{detail.venue_config?.article_types?.join(', ') || '—'}</div>
              </div>
              <div className="rounded-[22px] border border-line bg-white p-5">
                <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-flexee-600">Quality threshold</div>
                <div className="mt-2 text-[15px] leading-7 text-muted">{detail.venue_config?.quality_threshold || '—'}</div>
              </div>
              {detail.venue_config?.aims_scope && <div className="rounded-[22px] border border-line bg-white p-5 lg:col-span-2">
                <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-flexee-600">Aims & scope</div>
                <div className="mt-2 text-[15px] leading-7 text-muted">{detail.venue_config.aims_scope}</div>
              </div>}
            </div>}

            {detailTab === 'feedback' && <div className="space-y-4">
              <div className="rounded-[22px] border border-line bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-extrabold">Correct the agent</span>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[13px] font-extrabold text-muted">Venue scoped</span>
              </div>
              <p className="mt-2 text-[15px] leading-7 text-muted">Corrections stay scoped to this venue and do not rewrite another outlet's configuration or assessment history.</p>

              {canEditSelected ? <form className="mt-5 grid gap-4" onSubmit={recordFeedback}>
                <label>
                  <span className="mb-1.5 block text-[14px] font-extrabold">Assessment field</span>
                  <select className="field" value={feedbackField} onChange={e => setFeedbackField(e.target.value)}>
                    <option value="outlet_fit">Outlet fit</option>
                    <option value="policy_compliance">Policy compliance</option>
                    <option value="contribution">Contribution</option>
                    <option value="methods">Methods</option>
                    <option value="citation_integrity">Citation integrity</option>
                    <option value="reviewer_expertise">Reviewer expertise</option>
                    <option value="unresolved_risks">Unresolved risks</option>
                    <optgroup label="Venue Agent rule corrections">
                      <option value="aims_scope">Aims & scope</option>
                      <option value="article_types">Accepted article types</option>
                      <option value="accepted_methods">Accepted methods</option>
                      <option value="quality_threshold">Quality threshold</option>
                      <option value="reviewer_criteria">Reviewer criteria</option>
                      <option value="disclosures">Required disclosures</option>
                      <option value="reporting_standards">Reporting standards</option>
                      <option value="desk_rejection_rules">Desk-rejection guidance</option>
                    </optgroup>
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[14px] font-extrabold">Editor correction</span>
                  <textarea className="field min-h-[100px]" value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)} placeholder={venueRuleListFields.has(feedbackField) ? 'Enter one value per line.' : venueRuleFeedbackFields.has(feedbackField) ? 'Enter the corrected venue rule.' : 'What should the venue-specific assessment say instead?'} />
                </label>
                <label>
                  <span className="mb-1.5 block text-[14px] font-extrabold">Reason / evidence for correction</span>
                  <textarea className="field min-h-[100px]" required value={feedbackReason} onChange={e => setFeedbackReason(e.target.value)} placeholder="Explain why this correction should inform future assessments for this venue." />
                </label>
                <button className="w-fit rounded-2xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm" type="submit" disabled={busy === 'feedback'}>{busy === 'feedback' ? 'Recording…' : 'Record feedback'}</button>
              </form> : <p className="mt-4 text-[14px] text-muted">Your role has read-only access to this venue's editorial workspace.</p>}
              </div>

              {detail.feedback?.map(item => <div key={item.id} className="rounded-[22px] border border-line bg-white p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-extrabold">{pretty(item.assessment_field)}</span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[13px] font-extrabold text-muted">{item.draftable ? 'Venue rule' : 'Assessment only'}</span>
                </div>
                <p className="mt-2 text-[15px] leading-7 text-muted">{item.reason || 'No reason recorded.'}</p>
                <div className="mt-2 text-[13px] font-semibold text-[#8d8179]">{formatDate(item.created_at)}{item.venue_config_version ? ` · Config v${item.venue_config_version}` : ''}</div>
              </div>)}
            </div>}

            {detailTab === 'decision' && <div className="rounded-[22px] border border-line bg-white p-6">
              <h4 className="serif text-[32px]">Final editorial decision</h4>
              <p className="mt-2 text-[15px] leading-7 text-muted">Record a human editorial decision after reviewing venue rules, evidence and manuscript context.</p>

              {detail.decision && Object.keys(detail.decision).length > 0 && <div className="mt-4 rounded-2xl border border-line bg-[#fcfaf8] p-4">
                <StatusPill value={detail.decision.decision || detail.status} />
                <p className="mt-2 text-[14px] leading-6 text-muted">{detail.decision.note || 'No editor note.'}</p>
                <div className="mt-2 text-[13px] text-muted">{detail.decision.decided_by ? `Decided by ${detail.decision.decided_by}` : ''}{detail.decision.decided_at ? ` · ${new Date(detail.decision.decided_at).toLocaleString()}` : ''}</div>
              </div>}

              {decisionAllowed ? <form onSubmit={e => e.preventDefault()}>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button type="button" onClick={() => setDecision('accepted')} className={`rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-[14px] font-extrabold text-green-800 hover:bg-green-100 ${decision === 'accepted' ? 'ring-2 ring-green-300' : ''}`}>Accept manuscript</button>
                  <button type="button" onClick={() => setDecision('revision_requested')} className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-[14px] font-extrabold text-amber-800 hover:bg-amber-100 ${decision === 'revision_requested' ? 'ring-2 ring-amber-300' : ''}`}>Request revision</button>
                  <button type="button" onClick={() => setDecision('rejected')} className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-[14px] font-extrabold text-red-700 hover:bg-red-100 ${decision === 'rejected' ? 'ring-2 ring-red-300' : ''}`}>Reject manuscript</button>
                </div>
                <textarea className="field mt-4 min-h-[120px]" required={decision !== 'accepted'} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} placeholder="Editorial note..." />
                <button className="shine mt-4 w-fit rounded-2xl bg-flexee-500 px-5 py-3 text-[14px] font-extrabold text-white shadow-orange disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={recordDecision} disabled={busy === 'decision'}>
                  {busy === 'decision' ? 'Recording…' : `Record: ${statusLabels[decision]}`}
                </button>
              </form> : <p className="mt-4 text-[14px] text-muted">This submission is currently {statusLabels[detail.status] || detail.status}; no new decision action is available from this state.</p>}
            </div>}
          </div>
        </>}
      </article>
    </div>
  </div>
}
