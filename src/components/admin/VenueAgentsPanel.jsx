import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'

const emptyVenue = {
  name: '',
  venue_type: 'journal',
  description: '',
  organization_name: 'Flexee Publishing',
  organization_type: 'publisher',
  active: true,
}

const emptyConfig = {
  aims_scope: '',
  article_types: '',
  accepted_methods: '',
  quality_threshold: '',
  reviewer_criteria: '',
  policies: '{}',
  disclosures: '',
  reporting_standards: '',
  desk_rejection_rules: '',
  deadlines: '{}',
  submission_capacity: '{}',
  current_demand: '{}',
  config_notes: '',
}

function listToText(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function jsonToText(value) {
  try { return JSON.stringify(value || {}, null, 2) } catch { return '{}' }
}

function configToForm(config) {
  if (!config) return { ...emptyConfig }
  return {
    aims_scope: config.aims_scope || '',
    article_types: listToText(config.article_types),
    accepted_methods: listToText(config.accepted_methods),
    quality_threshold: config.quality_threshold || '',
    reviewer_criteria: listToText(config.reviewer_criteria),
    policies: jsonToText(config.policies),
    disclosures: listToText(config.disclosures),
    reporting_standards: listToText(config.reporting_standards),
    desk_rejection_rules: listToText(config.desk_rejection_rules),
    deadlines: jsonToText(config.deadlines),
    submission_capacity: jsonToText(config.submission_capacity),
    current_demand: jsonToText(config.current_demand),
    config_notes: config.config_notes || '',
  }
}

function parseList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

function parseObject(value, fieldName) {
  const text = String(value || '').trim()
  if (!text) return {}
  let parsed
  try { parsed = JSON.parse(text) } catch {
    throw new Error(`${fieldName} must be valid JSON.`)
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${fieldName} must be a JSON object.`)
  }
  return parsed
}

function configPayload(form) {
  return {
    aims_scope: form.aims_scope.trim(),
    article_types: parseList(form.article_types),
    accepted_methods: parseList(form.accepted_methods),
    quality_threshold: form.quality_threshold.trim(),
    reviewer_criteria: parseList(form.reviewer_criteria),
    policies: parseObject(form.policies, 'Policies'),
    disclosures: parseList(form.disclosures),
    reporting_standards: parseList(form.reporting_standards),
    desk_rejection_rules: parseList(form.desk_rejection_rules),
    deadlines: parseObject(form.deadlines, 'Deadlines'),
    submission_capacity: parseObject(form.submission_capacity, 'Submission capacity'),
    current_demand: parseObject(form.current_demand, 'Current demand'),
    config_notes: form.config_notes.trim(),
  }
}

function SmallPill({ children, tone = 'neutral' }) {
  return <span className={`venue-admin-pill ${tone}`}>{children}</span>
}

function Field({ label, hint, children, full = false }) {
  return <label className={`venue-admin-field ${full ? 'full' : ''}`}>
    <span>{label}</span>
    {hint && <small>{hint}</small>}
    {children}
  </label>
}

export default function VenueAgentsPanel() {
  const [venues, setVenues] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [configs, setConfigs] = useState([])
  const [venueForm, setVenueForm] = useState(null)
  const [configForm, setConfigForm] = useState({ ...emptyConfig })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...emptyVenue })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadVenues(preferredId) {
    setError('')
    const payload = await api('/api/admin/venues/')
    const items = payload.venues || []
    setVenues(items)
    const nextId = preferredId || selectedId || items[0]?.id || ''
    setSelectedId(nextId)
    if (nextId) await loadVenue(nextId)
    else {
      setSelectedVenue(null)
      setConfigs([])
      setVenueForm(null)
      setConfigForm({ ...emptyConfig })
    }
    setLoading(false)
  }

  async function loadVenue(id) {
    setError('')
    const [venuePayload, configPayloadResult] = await Promise.all([
      api(`/api/admin/venues/${id}/`),
      api(`/api/admin/venues/${id}/configs/`),
    ])
    const venue = venuePayload.venue
    const history = configPayloadResult.configs || []
    setSelectedVenue(venue)
    setVenueForm({
      name: venue.name || '',
      venue_type: venue.venue_type || 'journal',
      description: venue.description || '',
      active: Boolean(venue.active),
    })
    setConfigs(history)
    const active = history.find(item => item.active) || history[0] || venue.config
    setConfigForm(configToForm(active))
  }

  useEffect(() => {
    loadVenues().catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [])

  async function createVenue(e) {
    e.preventDefault()
    setBusy('create')
    setError('')
    setSuccess('')
    try {
      const payload = await api('/api/admin/venues/', {
        method: 'POST',
        body: JSON.stringify(createForm),
      })
      setShowCreate(false)
      setCreateForm({ ...emptyVenue })
      setSuccess(`${payload.venue.name} created. Add its first Venue Agent configuration next.`)
      await loadVenues(payload.venue.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function saveVenue(e) {
    e.preventDefault()
    if (!selectedId || !venueForm) return
    setBusy('venue')
    setError('')
    setSuccess('')
    try {
      const payload = await api(`/api/admin/venues/${selectedId}/`, {
        method: 'PATCH',
        body: JSON.stringify(venueForm),
      })
      setSelectedVenue(payload.venue)
      setSuccess('Venue metadata saved.')
      const list = await api('/api/admin/venues/')
      setVenues(list.venues || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function createConfig(e) {
    e.preventDefault()
    if (!selectedId) return
    setBusy('config')
    setError('')
    setSuccess('')
    try {
      const payload = configPayload(configForm)
      const result = await api(`/api/admin/venues/${selectedId}/config/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSuccess(`Venue Agent configuration v${result.config.version} created and activated.`)
      await loadVenue(selectedId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function activateConfig(config) {
    if (!selectedId || config.active) return
    setBusy(`activate-${config.id}`)
    setError('')
    setSuccess('')
    try {
      await api(`/api/admin/venues/${selectedId}/configs/${config.id}/activate/`, {
        method: 'POST',
        body: '{}',
      })
      setSuccess(`Configuration v${config.version} is active again.`)
      await loadVenue(selectedId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const activeConfig = useMemo(
    () => configs.find(item => item.active) || null,
    [configs],
  )

  if (loading) {
    return <div className="venue-admin-state"><h3>Loading Venue Agents…</h3></div>
  }

  return <div className="venue-admin-layout">
    <aside className="venue-admin-list">
      <div className="venue-admin-list-head">
        <div>
          <p className="venue-admin-kicker">Subscriber venues</p>
          <h3>Venue Agents</h3>
        </div>
        <button className="admin-btn" type="button" onClick={() => setShowCreate(value => !value)}>+ Venue</button>
      </div>

      {showCreate && <form className="venue-admin-create" onSubmit={createVenue}>
        <Field label="Venue name" full><input value={createForm.name} onChange={e => setCreateForm({...createForm, name:e.target.value})} required /></Field>
        <div className="venue-admin-two">
          <Field label="Type"><select value={createForm.venue_type} onChange={e => setCreateForm({...createForm, venue_type:e.target.value})}><option value="journal">Journal</option><option value="conference">Conference</option><option value="publisher">Publisher</option></select></Field>
          <Field label="Organization"><input value={createForm.organization_name} onChange={e => setCreateForm({...createForm, organization_name:e.target.value})} /></Field>
        </div>
        <Field label="Description" full><textarea rows="3" value={createForm.description} onChange={e => setCreateForm({...createForm, description:e.target.value})} /></Field>
        <div className="venue-admin-actions">
          <button className="admin-btn secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="admin-btn" type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create venue'}</button>
        </div>
      </form>}

      <div className="venue-admin-venue-list">
        {venues.map(venue => <button
          type="button"
          key={venue.id}
          className={`venue-admin-venue ${selectedId === venue.id ? 'active' : ''}`}
          onClick={() => {
            setSelectedId(venue.id)
            loadVenue(venue.id).catch(err => setError(err.message))
          }}
        >
          <span className="venue-admin-venue-icon">{venue.venue_type === 'journal' ? 'J' : venue.venue_type === 'conference' ? 'C' : 'P'}</span>
          <span>
            <b>{venue.name}</b>
            <small>{venue.venue_type} · {venue.active ? 'Active' : 'Inactive'}</small>
          </span>
          {venue.config?.version && <SmallPill tone="good">v{venue.config.version}</SmallPill>}
        </button>)}
        {!venues.length && <div className="venue-admin-empty">No venues are configured yet.</div>}
      </div>
    </aside>

    <section className="venue-admin-main">
      {error && <div className="admin-error venue-admin-message">{error}</div>}
      {success && <div className="venue-admin-success venue-admin-message">{success}</div>}

      {!selectedVenue ? <div className="venue-admin-state">
        <p className="venue-admin-kicker">No venue selected</p>
        <h3>Create or select a venue to configure its editorial agent.</h3>
      </div> : <>
        <div className="venue-admin-header">
          <div>
            <p className="venue-admin-kicker">Venue Agent</p>
            <h2>{selectedVenue.name}</h2>
            <p>{selectedVenue.description || 'No description yet.'}</p>
          </div>
          <div className="venue-admin-header-badges">
            <SmallPill tone={selectedVenue.active ? 'good' : 'warn'}>{selectedVenue.active ? 'Venue active' : 'Venue inactive'}</SmallPill>
            <SmallPill>{activeConfig ? `Config v${activeConfig.version}` : 'No config'}</SmallPill>
          </div>
        </div>

        <form className="venue-admin-card" onSubmit={saveVenue}>
          <div className="venue-admin-card-head">
            <div><p className="venue-admin-kicker">Identity</p><h3>Venue metadata</h3></div>
            <button className="admin-btn secondary" type="submit" disabled={busy === 'venue'}>{busy === 'venue' ? 'Saving…' : 'Save metadata'}</button>
          </div>
          <div className="venue-admin-form-grid">
            <Field label="Venue name"><input value={venueForm?.name || ''} onChange={e => setVenueForm({...venueForm, name:e.target.value})} required /></Field>
            <Field label="Venue type"><select value={venueForm?.venue_type || 'journal'} onChange={e => setVenueForm({...venueForm, venue_type:e.target.value})}><option value="journal">Journal</option><option value="conference">Conference</option><option value="publisher">Publisher</option></select></Field>
            <Field label="Description" full><textarea rows="3" value={venueForm?.description || ''} onChange={e => setVenueForm({...venueForm, description:e.target.value})} /></Field>
            <label className="venue-admin-check full"><input type="checkbox" checked={Boolean(venueForm?.active)} onChange={e => setVenueForm({...venueForm, active:e.target.checked})} /><span>Active and visible to authors for matching</span></label>
          </div>
        </form>

        <form className="venue-admin-card" onSubmit={createConfig}>
          <div className="venue-admin-card-head">
            <div>
              <p className="venue-admin-kicker">Editorial intelligence</p>
              <h3>Create the next configuration version</h3>
              <p>Saving creates a new immutable version and makes it active. Existing submissions remain pinned to the version they used.</p>
            </div>
            <button className="admin-btn" type="submit" disabled={busy === 'config'}>{busy === 'config' ? 'Creating…' : activeConfig ? 'Create new version' : 'Create first config'}</button>
          </div>

          <div className="venue-admin-form-grid">
            <Field label="Aims & scope" hint="What this venue publishes and the boundaries of its subject matter." full><textarea rows="6" value={configForm.aims_scope} onChange={e => setConfigForm({...configForm, aims_scope:e.target.value})} /></Field>
            <Field label="Accepted article types" hint="One per line. Example: Research article"><textarea rows="5" value={configForm.article_types} onChange={e => setConfigForm({...configForm, article_types:e.target.value})} /></Field>
            <Field label="Accepted methods" hint="One per line. Leave blank if method-neutral."><textarea rows="5" value={configForm.accepted_methods} onChange={e => setConfigForm({...configForm, accepted_methods:e.target.value})} /></Field>
            <Field label="Quality threshold" full><textarea rows="4" value={configForm.quality_threshold} onChange={e => setConfigForm({...configForm, quality_threshold:e.target.value})} /></Field>
            <Field label="Reviewer criteria" hint="Expertise areas, one per line."><textarea rows="5" value={configForm.reviewer_criteria} onChange={e => setConfigForm({...configForm, reviewer_criteria:e.target.value})} /></Field>
            <Field label="Required disclosures" hint="One per line."><textarea rows="5" value={configForm.disclosures} onChange={e => setConfigForm({...configForm, disclosures:e.target.value})} /></Field>
            <Field label="Reporting standards" hint="One per line."><textarea rows="6" value={configForm.reporting_standards} onChange={e => setConfigForm({...configForm, reporting_standards:e.target.value})} /></Field>
            <Field label="Desk-rejection rules" hint="One per line."><textarea rows="6" value={configForm.desk_rejection_rules} onChange={e => setConfigForm({...configForm, desk_rejection_rules:e.target.value})} /></Field>
            <Field label="Policies (JSON)" hint='Structured rules such as {"word_count":{"min":1500,"max":3000}}' full><textarea className="venue-admin-code" rows="10" value={configForm.policies} onChange={e => setConfigForm({...configForm, policies:e.target.value})} /></Field>
            <Field label="Current demand (JSON)" hint='Special issues, tracks, priorities, or topics. Example: {"topics":["AI agents"]}'><textarea className="venue-admin-code" rows="7" value={configForm.current_demand} onChange={e => setConfigForm({...configForm, current_demand:e.target.value})} /></Field>
            <Field label="Deadlines (JSON)"><textarea className="venue-admin-code" rows="7" value={configForm.deadlines} onChange={e => setConfigForm({...configForm, deadlines:e.target.value})} /></Field>
            <Field label="Submission capacity (JSON)"><textarea className="venue-admin-code" rows="7" value={configForm.submission_capacity} onChange={e => setConfigForm({...configForm, submission_capacity:e.target.value})} /></Field>
            <Field label="Configuration notes"><textarea rows="7" value={configForm.config_notes} onChange={e => setConfigForm({...configForm, config_notes:e.target.value})} /></Field>
          </div>
        </form>

        <section className="venue-admin-card">
          <div className="venue-admin-card-head">
            <div><p className="venue-admin-kicker">Audit trail</p><h3>Configuration history</h3><p>Older versions can be reactivated without changing the historical version attached to past submissions.</p></div>
          </div>
          <div className="venue-admin-history">
            {configs.map(config => <article key={config.id}>
              <div>
                <div className="venue-admin-history-title">
                  <b>Version {config.version}</b>
                  {config.active && <SmallPill tone="good">Active</SmallPill>}
                </div>
                <p>{config.aims_scope || 'No aims and scope recorded.'}</p>
                <small>Created {new Date(config.created_at).toLocaleString()}</small>
              </div>
              <div className="venue-admin-history-actions">
                <button className="admin-btn secondary" type="button" onClick={() => setConfigForm(configToForm(config))}>Load into editor</button>
                {!config.active && <button className="admin-btn secondary" type="button" disabled={busy === `activate-${config.id}`} onClick={() => activateConfig(config)}>{busy === `activate-${config.id}` ? 'Activating…' : 'Reactivate'}</button>}
              </div>
            </article>)}
            {!configs.length && <div className="venue-admin-empty">No Venue Agent configuration has been created yet.</div>}
          </div>
        </section>
      </>}
    </section>
  </div>
}
