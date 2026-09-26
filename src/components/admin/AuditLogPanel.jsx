import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'

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
  'legacy_submission.viewed': 'Legacy submission viewed',
  'legacy_submission.manuscript_downloaded': 'Legacy manuscript downloaded',
  'legacy_submission.decision_recorded': 'Legacy decision recorded',
  'legacy_submission.email_sent': 'Legacy email sent',
  'legacy_submission.deleted': 'Legacy submission deleted',
  'smtp.updated': 'SMTP configuration updated',
}

function shortId(value) {
  const text = String(value || '')
  return text ? (text.length > 18 ? text.slice(0, 8) + '…' + text.slice(-4) : text) : '—'
}

function labelAction(value) {
  return actionLabels[value] || String(value || '').replaceAll('_', ' ').replaceAll('.', ' · ')
}

export default function AuditLogPanel() {
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ q: '', action: '' })
  const [applied, setApplied] = useState({ q: '', action: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: '200' })
    if (applied.q.trim()) params.set('q', applied.q.trim())
    if (applied.action) params.set('action', applied.action)
    return params.toString()
  }, [applied])

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

  function apply(e) {
    e.preventDefault()
    setApplied({ ...filters })
  }

  return <div>
    <div style={{ marginBottom: '28px' }}>
      <p className="venue-admin-kicker">Production controls</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '42px', fontWeight: 'normal', margin: '0 0 10px', color: 'var(--ink)' }}>Audit log</h2>
      <p style={{ margin: 0, color: 'var(--muted)', maxWidth: '760px' }}>
        Immutable records of editor/admin access and important editorial or configuration actions. Organization users only see events from organizations they belong to.
      </p>
    </div>

    <form className="admin-filters" onSubmit={apply}>
      <input
        type="search"
        placeholder="Search actor, action, role, or resource ID"
        value={filters.q}
        onChange={e => setFilters({...filters, q: e.target.value})}
      />
      <select value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})}>
        <option value="">All audited actions</option>
        {Object.entries(actionLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
      <button className="admin-btn" type="submit">Apply</button>
      <button className="admin-btn secondary" type="button" onClick={() => {
        setFilters({ q: '', action: '' })
        setApplied({ q: '', action: '' })
      }}>Clear</button>
    </form>

    {error && <div className="admin-error">{error}</div>}

    <section className="admin-table-card">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(28,26,23,0.08)', color: 'var(--muted)', fontSize: '13px' }}>
        {loading ? 'Loading audit events…' : total.toLocaleString() + ' event' + (total === 1 ? '' : 's') + (total > 200 ? ' · showing newest 200' : '')}
      </div>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Context</th>
            </tr>
          </thead>
          <tbody>
            {!loading && events.map(event => <tr key={event.id}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <div>{new Date(event.occurred_at).toLocaleDateString()}</div>
                <div className="data-meta">{new Date(event.occurred_at).toLocaleTimeString()}</div>
              </td>
              <td>
                <div className="data-title">{event.actor_email || 'System/unknown'}</div>
                <div className="data-meta">{event.actor_role || '—'}</div>
              </td>
              <td>
                <b>{labelAction(event.action)}</b>
                <div className="data-meta">{event.action}</div>
              </td>
              <td>
                <div>{event.resource_type || '—'}</div>
                <div className="data-meta" title={event.resource_id || ''}>{shortId(event.resource_id)}</div>
              </td>
              <td>
                {event.venue_submission_id && <div className="data-meta">Submission: {shortId(event.venue_submission_id)}</div>}
                {event.venue_id && <div className="data-meta">Venue: {shortId(event.venue_id)}</div>}
                {event.organization_id && <div className="data-meta">Organization: {shortId(event.organization_id)}</div>}
                {event.detail && Object.keys(event.detail).length > 0 && <details style={{ marginTop: '6px' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--copper)', fontSize: '12px' }}>Details</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', maxWidth: '420px', fontSize: '11px', margin: '8px 0 0' }}>{JSON.stringify(event.detail, null, 2)}</pre>
                </details>}
              </td>
            </tr>)}
            {!loading && !events.length && <tr><td colSpan="5" style={{ padding: '42px', textAlign: 'center', color: 'var(--muted)' }}>No audit events match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>
}
