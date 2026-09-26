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
  const tone = value === 'accepted' ? 'good' : ['rejected', 'revision_requested'].includes(value) ? 'warn' : 'neutral'
  return <span className={`venue-admin-pill ${tone}`}>{statusLabels[value] || value || '—'}</span>
}

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, x => x.toUpperCase())
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
      const agentValue = detail.editorial_brief?.[feedbackField] ?? null
      await api(`/api/admin/venues/${detail.venue.id}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({
          venue_submission_id: selectedId,
          assessment_field: feedbackField,
          agent_value: agentValue,
          editor_value: feedbackValue ? { note: feedbackValue } : null,
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

  return <div className="editor-workspace">
    <div className="editor-workspace-head">
      <div>
        <p className="venue-admin-kicker">Venue editor workspace</p>
        <h2>Human editorial review</h2>
        <p>Review the venue-specific brief and evidence, record corrections, and make the final editorial decision.</p>
      </div>
    </div>

    {error && <div className="admin-error venue-admin-message">{error}</div>}
    {success && <div className="venue-admin-success venue-admin-message">{success}</div>}

    <section className="editor-stats">
      <button type="button" onClick={() => setFilters({...filters, status:''})}><b>{data.counts?.total || 0}</b><span>Editorial queue</span></button>
      <button type="button" onClick={() => setFilters({...filters, status:'submitted'})}><b>{data.counts?.submitted || 0}</b><span>Submitted</span></button>
      <button type="button" onClick={() => setFilters({...filters, status:'under_review'})}><b>{data.counts?.under_review || 0}</b><span>Under review</span></button>
      <button type="button" onClick={() => setFilters({...filters, status:'revision_requested'})}><b>{data.counts?.revision_requested || 0}</b><span>Revision requested</span></button>
      <button type="button" onClick={() => setFilters({...filters, status:'accepted'})}><b>{data.counts?.accepted || 0}</b><span>Accepted</span></button>
      <button type="button" onClick={() => setFilters({...filters, status:'rejected'})}><b>{data.counts?.rejected || 0}</b><span>Rejected</span></button>
    </section>

    <div className="editor-filterbar">
      <input
        value={filters.q}
        onChange={e => setFilters({...filters, q:e.target.value})}
        placeholder="Search manuscript, author, email, or venue…"
      />
      <select value={filters.venue_id} onChange={e => setFilters({...filters, venue_id:e.target.value})}>
        <option value="">All venues</option>
        {venues.map(venue => <option value={venue.id} key={venue.id}>{venue.name}</option>)}
      </select>
      <select value={filters.status} onChange={e => setFilters({...filters, status:e.target.value})}>
        <option value="">All editorial statuses</option>
        {Object.entries(statusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}
      </select>
    </div>

    <div className="editor-grid">
      <section className="editor-queue">
        {loading ? <div className="venue-admin-state"><h3>Loading editorial queue…</h3></div> :
          data.items?.length ? data.items.map(item => <button
            type="button"
            key={item.id}
            className={`editor-queue-item ${selectedId === item.id ? 'active' : ''}`}
            onClick={() => openSubmission(item.id)}
          >
            <div className="editor-queue-item-top">
              <span className="editor-venue-name">{item.venue?.name}</span>
              <StatusPill value={item.status} />
            </div>
            <h3>{item.manuscript?.title}</h3>
            <p>{item.manuscript?.author_name}{item.manuscript?.author_email ? ` · ${item.manuscript.author_email}` : ''}</p>
            <small>{item.submitted_at ? new Date(item.submitted_at).toLocaleString() : new Date(item.created_at).toLocaleString()}</small>
          </button>) : <div className="venue-admin-state">
            <p className="venue-admin-kicker">Queue clear</p>
            <h3>No venue submissions match these filters.</h3>
          </div>
        }
      </section>

      <section className="editor-detail">
        {!selectedId ? <div className="venue-admin-state">
          <p className="venue-admin-kicker">Select a submission</p>
          <h3>The editorial brief, evidence, and decision tools will appear here.</h3>
        </div> : detailLoading || !detail ? <div className="venue-admin-state"><h3>Loading editorial packet…</h3></div> : <>
          <div className="editor-detail-head">
            <div>
              <span className="editor-venue-name">{detail.venue?.name} · config v{detail.venue_config_version || '—'}</span>
              <h2>{detail.manuscript?.title}</h2>
              <p>{detail.manuscript?.author_name} · {pretty(detail.manuscript?.manuscript_type)}</p>
            </div>
            <StatusPill value={detail.status} />
          </div>

          {detail.retention_purged_at && <div className="venue-admin-success venue-admin-message">
            Venue-retained manuscript content expired on {new Date(detail.retention_purged_at).toLocaleString()}. Editorial status and human decision metadata remain available.
          </div>}
          {!detail.retention_purged_at && detail.retention_expires_at && <div className="venue-admin-message">
            Retention expiry: {new Date(detail.retention_expires_at).toLocaleString()}
          </div>}

          <div className="editor-detail-actions">
            <button className="admin-btn secondary" type="button" onClick={downloadManuscript} disabled={busy === 'download' || Boolean(detail.retention_purged_at)}>{detail.retention_purged_at ? 'Manuscript expired' : busy === 'download' ? 'Downloading…' : 'Download manuscript'}</button>
            {canEditSelected && ['submitted', 'revision_requested'].includes(detail.status) && <button className="admin-btn" type="button" onClick={startReview} disabled={busy === 'review'}>{busy === 'review' ? 'Starting…' : 'Start review'}</button>}
          </div>

          <section className="editor-detail-card">
            <p className="venue-admin-kicker">Manuscript</p>
            <div className="editor-manuscript-meta">
              <div><span>Author</span><b>{detail.manuscript?.author_name}</b></div>
              <div><span>Email</span><b>{detail.manuscript?.author_email || '—'}</b></div>
              <div><span>Co-authors</span><b>{detail.manuscript?.coauthors || '—'}</b></div>
              <div><span>File</span><b>{detail.retention_purged_at ? 'Expired under retention policy' : detail.manuscript?.manuscript_filename || '—'}</b></div>
            </div>
            {detail.manuscript?.abstract && <div className="editor-long-copy"><span>Abstract</span><p>{detail.manuscript.abstract}</p></div>}
            {detail.manuscript?.disclosure && <div className="editor-long-copy"><span>AI-use disclosure</span><p>{detail.manuscript.disclosure}</p></div>}
          </section>

          {detail.requirements?.configured && <section className="editor-detail-card">
            <p className="venue-admin-kicker">Venue submission requirements</p>
            <h3>{detail.requirements.complete ? 'All required venue items were completed.' : 'Some venue requirements are incomplete.'}</h3>
            <div className="editor-requirement-list">
              {(detail.requirements.items || []).map(item => <article className="editor-brief-block" key={item.key}>
                <span>{item.label}{item.required ? ' · Required' : ' · Optional'}</span>
                {item.type === 'file' ? <>
                  <p>{item.file?.name || 'No file supplied.'}</p>
                  {item.file && <button className="admin-btn secondary" type="button" onClick={() => downloadRequirementFile(item)} disabled={busy === `requirement-${item.key}`}>
                    {busy === `requirement-${item.key}` ? 'Downloading…' : 'Download file'}
                  </button>}
                </> : item.type === 'checkbox' ? <p>{item.value ? 'Confirmed' : 'Not confirmed'}</p> : <p>{item.value || 'No response supplied.'}</p>}
              </article>)}
            </div>
          </section>}

          <section className="editor-detail-card">
            <p className="venue-admin-kicker">AI-prepared editorial brief</p>
            <h3>{detail.editorial_brief?.editor_summary || 'No editorial summary is available.'}</h3>
            {detail.editorial_brief?.decision_authority && <p className="editor-decision-authority">{detail.editorial_brief.decision_authority}</p>}
            
            {detail.editorial_brief?.analysis_coverage && typeof detail.editorial_brief.analysis_coverage.coverage_percent !== 'undefined' && (
              <article className="editor-brief-block">
                <span>Analysis Coverage</span>
                <p>
                  Chunks analyzed: {detail.editorial_brief.analysis_coverage.chunks_analyzed} / {detail.editorial_brief.analysis_coverage.chunks_total}
                  <br />
                  Coverage: {detail.editorial_brief.analysis_coverage.coverage_percent}%
                </p>
              </article>
            )}

            <div className="editor-brief-grid">
              <BriefBlock label="Outlet fit" value={detail.editorial_brief?.outlet_fit} />
              <BriefBlock label="Policy compliance" value={detail.editorial_brief?.policy_compliance} />
              <BriefBlock label="Contribution" value={detail.editorial_brief?.contribution} />
              <BriefBlock label="Methods" value={detail.editorial_brief?.methods} />
              <BriefBlock label="Citation integrity" value={detail.editorial_brief?.citation_integrity} />
            </div>

            {detail.editorial_brief?.reviewer_expertise?.length > 0 && <div className="editor-chip-section">
              <span>Suggested reviewer expertise</span>
              <div>{detail.editorial_brief.reviewer_expertise.map(item => <em key={item}>{item}</em>)}</div>
            </div>}
            {detail.editorial_brief?.unresolved_risks?.length > 0 && <div className="editor-risk-list">
              <span>Unresolved risks</span>
              <ul>{detail.editorial_brief.unresolved_risks.map((item,index) => <li key={index}>{typeof item === 'string' ? item : item.risk || JSON.stringify(item)}</li>)}</ul>
            </div>}
          </section>

          <section className="editor-detail-card">
            <p className="venue-admin-kicker">Evidence trail</p>
            <h3>Findings linked to manuscript, venue policy, or verified sources</h3>
            <div className="editor-evidence-list">
              {detail.evidence?.length ? detail.evidence.map(item => <article key={item.id}>
                <div><b>{pretty(item.finding_type)}</b><span>{pretty(item.source_type)}</span></div>
                <p>{item.claim}</p>
                <small>{item.source_locator || 'No locator'}{item.source_url ? ` · ${item.source_url}` : ''}</small>
                {item.excerpt && <blockquote>{item.excerpt}</blockquote>}
              </article>) : <p className="venue-admin-empty">No evidence findings are attached.</p>}
            </div>
          </section>

          <section className="editor-detail-card">
            <p className="venue-admin-kicker">Venue rule snapshot</p>
            <h3>Configuration used for this submission</h3>
            {detail.venue_config ? <div className="editor-config-snapshot">
              <div><span>Aims & scope</span><p>{detail.venue_config.aims_scope || '—'}</p></div>
              <div><span>Article types</span><p>{detail.venue_config.article_types?.join(', ') || '—'}</p></div>
              <div><span>Quality threshold</span><p>{detail.venue_config.quality_threshold || '—'}</p></div>
              <div><span>Current demand</span><pre>{JSON.stringify(detail.venue_config.current_demand || {}, null, 2)}</pre></div>
            </div> : <p className="venue-admin-empty">No venue configuration snapshot is attached.</p>}
          </section>

          <section className="editor-detail-card">
            <p className="venue-admin-kicker">Correct the agent</p>
            <h3>Record venue-specific editor feedback</h3>
            <p className="editor-card-copy">Corrections stay scoped to this venue. They do not rewrite another outlet's configuration or assessment history.</p>
            {canEditSelected ? <form className="editor-feedback-form" onSubmit={recordFeedback}>
              <label><span>Assessment field</span><select value={feedbackField} onChange={e => setFeedbackField(e.target.value)}>
                <option value="outlet_fit">Outlet fit</option>
                <option value="policy_compliance">Policy compliance</option>
                <option value="contribution">Contribution</option>
                <option value="methods">Methods</option>
                <option value="citation_integrity">Citation integrity</option>
                <option value="reviewer_expertise">Reviewer expertise</option>
                <option value="unresolved_risks">Unresolved risks</option>
              </select></label>
              <label><span>Editor correction</span><textarea rows="3" value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)} placeholder="What should the venue-specific assessment say instead?" /></label>
              <label><span>Reason / evidence for correction</span><textarea rows="3" required value={feedbackReason} onChange={e => setFeedbackReason(e.target.value)} placeholder="Explain why this correction should inform future assessments for this venue." /></label>
              <button className="admin-btn secondary" type="submit" disabled={busy === 'feedback'}>{busy === 'feedback' ? 'Recording…' : 'Record feedback'}</button>
            </form> : <p className="editor-card-copy">Your role has read-only access to this venue's editorial workspace.</p>}

            {detail.feedback?.length > 0 && <div className="editor-feedback-history">
              <span>Recorded feedback</span>
              {detail.feedback.map(item => <article key={item.id}>
                <b>{pretty(item.assessment_field)}</b>
                <p>{item.reason || 'No reason recorded.'}</p>
                <small>{new Date(item.created_at).toLocaleString()}</small>
              </article>)}
            </div>}
          </section>

          <section className="editor-detail-card editor-decision-card">
            <p className="venue-admin-kicker">Human decision</p>
            <h3>Final editorial authority stays here.</h3>
            {detail.decision && Object.keys(detail.decision).length > 0 && <div className="editor-existing-decision">
              <StatusPill value={detail.decision.decision || detail.status} />
              <p>{detail.decision.note || 'No editor note.'}</p>
              <small>{detail.decision.decided_by ? `Decided by ${detail.decision.decided_by}` : ''}{detail.decision.decided_at ? ` · ${new Date(detail.decision.decided_at).toLocaleString()}` : ''}</small>
            </div>}

            {decisionAllowed ? <form className="editor-decision-form" onSubmit={recordDecision}>
              <label><span>Decision</span><select value={decision} onChange={e => setDecision(e.target.value)}>
                <option value="revision_requested">Request revision</option>
                <option value="accepted">Accept</option>
                <option value="rejected">Reject</option>
              </select></label>
              <label><span>Editor note {decision === 'accepted' ? '(optional)' : '(required)'}</span><textarea rows="4" required={decision !== 'accepted'} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} placeholder="Record the rationale or instructions for the author." /></label>
              <button className={`admin-btn ${decision === 'rejected' ? 'danger' : ''}`} type="submit" disabled={busy === 'decision'}>{busy === 'decision' ? 'Recording…' : `Record: ${statusLabels[decision]}`}</button>
            </form> : <p className="editor-card-copy">This submission is currently {statusLabels[detail.status] || detail.status}; no new decision action is available from this state.</p>}
          </section>
        </>}
      </section>
    </div>
  </div>
}
