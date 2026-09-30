import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'

const emptyVenue = {
  name: '',
  venue_type: 'journal',
  description: '',
  organization_id: '',
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
  structured_desk_rejection_rules: '[]',
  required_submission_items: '[]',
  retention_days: '',
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
    structured_desk_rejection_rules: JSON.stringify(config.structured_desk_rejection_rules || [], null, 2),
    required_submission_items: JSON.stringify(config.required_submission_items || [], null, 2),
    retention_days: config.retention_days == null ? '' : String(config.retention_days),
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

function parseArrayJson(value, fieldName) {
  const text = String(value || '').trim()
  if (!text) return []
  let parsed
  try { parsed = JSON.parse(text) } catch {
    throw new Error(`${fieldName} must be valid JSON.`)
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON array.`)
  }
  return parsed
}

function parseRetentionDays(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = Number(text)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650) {
    throw new Error('Retention days must be a whole number from 1 to 3650, or left blank.')
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
    structured_desk_rejection_rules: parseArrayJson(form.structured_desk_rejection_rules, 'Deterministic desk-rejection rules'),
    required_submission_items: parseArrayJson(form.required_submission_items, 'Required submission items'),
    retention_days: parseRetentionDays(form.retention_days),
    deadlines: parseObject(form.deadlines, 'Deadlines'),
    submission_capacity: parseObject(form.submission_capacity, 'Submission capacity'),
    current_demand: parseObject(form.current_demand, 'Current demand'),
    config_notes: form.config_notes.trim(),
  }
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line bg-white text-muted',
    good: 'border-green-200 bg-green-50 text-green-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
  }
  return <span className={`rounded-full border px-3 py-2 text-[13px] font-extrabold ${tones[tone] || tones.neutral}`}>{children}</span>
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

function venueTypeLabel(value) {
  const text = String(value || '')
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

function venueInitial(value) {
  return value === 'journal' ? 'J' : value === 'conference' ? 'C' : 'P'
}

function Field({ label, children, full = false, help = null }) {
  return <div className={`block ${full ? 'lg:col-span-2' : ''}`}>
    <div className="mb-1.5 flex items-center gap-2 text-[14px] font-extrabold">
      <span>{label}</span>
      {help && <details className="venue-admin-help">
        <summary aria-label={`Show help for ${label}`} title={`Help for ${label}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/>
            <circle cx="12" cy="12" r="2.7"/>
          </svg>
        </summary>
        <div className="venue-admin-help-popover">
          <b>What to enter</b>
          <p>{help.description}</p>
          <b>Example</b>
          <pre>{help.example}</pre>
        </div>
      </details>}
    </div>
    {children}
  </div>
}

const configFieldHelp = {
  aims_scope: {
    description: 'Describe what the venue publishes, its priority subject areas, and the boundaries of what is in or out of scope.',
    example: 'This journal publishes applied artificial intelligence research in business and organizational environments, including enterprise AI adoption, automation, governance, digital transformation, and measurable organizational outcomes.'
  },
  article_types: {
    description: 'Enter each manuscript type the venue accepts on a separate line.',
    example: 'Research article\nCase study\nReview article\nIndustry report\nTechnical note'
  },
  accepted_methods: {
    description: 'Enter accepted research methods or study designs, one per line. Leave this blank when the venue is method-neutral.',
    example: 'Case study\nMixed methods\nSurvey research\nQualitative interviews'
  },
  quality_threshold: {
    description: 'Describe the minimum quality expectations a submission should meet before an editor considers it suitable for review.',
    example: 'Submissions should present a clear problem statement, evidence-based analysis, transparent methodology, practical relevance, measurable outcomes, and explicit limitations.'
  },
  reviewer_criteria: {
    description: 'Enter reviewer expertise areas that are appropriate for this venue, one per line.',
    example: 'Enterprise artificial intelligence\nDigital transformation\nAI governance\nBusiness process automation\nOrganizational change'
  },
  disclosures: {
    description: 'Enter every disclosure authors must provide, one requirement per line.',
    example: 'AI-use disclosure required\nFunding disclosure required\nConflict of interest disclosure required\nData availability statement required'
  },
  reporting_standards: {
    description: 'Enter the reporting or manuscript-quality standards expected by the venue, one per line.',
    example: 'Clear research objectives\nTransparent methodology\nEvidence-supported conclusions\nLimitations discussed\nReferences included'
  },
  desk_rejection_rules: {
    description: 'Enter human-readable desk-rejection guidance for the venue agent. Put one rule on each line.',
    example: 'No clear AI application\nInsufficient supporting evidence\nMissing methodology\nPurely promotional content\nMissing required disclosures'
  },
  structured_desk_rejection_rules: {
    description: 'Enter deterministic desk-rejection rules as a JSON array. Supported fields include word_count, reference_count, required_sections, manuscript_type, and disclosure.',
    example: '[\n  {\n    "field": "word_count",\n    "operator": ">",\n    "value": 8000,\n    "message": "Maximum length is 8,000 words."\n  },\n  {\n    "field": "required_sections",\n    "operator": "missing_any",\n    "value": ["Methods", "Results"],\n    "message": "Methods and Results are required."\n  }\n]'
  },
  required_submission_items: {
    description: 'Define extra author submission requirements as a JSON array. Supported types are text, textarea, url, checkbox, and file.',
    example: '[\n  {\n    "key": "cover_letter",\n    "label": "Cover letter",\n    "type": "file",\n    "required": true\n  },\n  {\n    "key": "orcid",\n    "label": "ORCID",\n    "type": "text",\n    "required": true\n  }\n]'
  },
  retention_days: {
    description: 'Enter the number of days the venue may retain submitted manuscript content. The countdown starts at formal submission. Leave blank when no retention period is configured.',
    example: '365'
  },
  policies: {
    description: 'Enter structured venue policies as a JSON object. Use this for machine-readable limits or requirements.',
    example: '{\n  "word_count": {\n    "min": 1500,\n    "max": 8000\n  },\n  "blind_review": true,\n  "requires_references": true\n}'
  },
  current_demand: {
    description: 'Describe current special issues, editorial priorities, tracks, or topics as JSON.',
    example: '{\n  "topics": [\n    "Generative AI",\n    "Enterprise AI",\n    "AI Governance",\n    "Digital Transformation"\n  ],\n  "priority": "high"\n}'
  },
  deadlines: {
    description: 'Enter the venue\'s expected editorial timing as JSON. Use numeric day values where applicable.',
    example: '{\n  "review_days": 30,\n  "revision_days": 21,\n  "publication_cycle_days": 90\n}'
  },
  submission_capacity: {
    description: 'Enter operational submission capacity information as JSON, such as annual capacity or a planning acceptance-rate target.',
    example: '{\n  "annual_capacity": 100,\n  "acceptance_rate_target": 0.25\n}'
  },
  config_notes: {
    description: 'Enter internal notes explaining the purpose, source, or special context of this configuration version.',
    example: 'Updated for the 2026 editorial cycle. Added mixed-methods submissions and expanded enterprise AI priorities.'
  }
}

export default function VenueAgentsPanel({ platformSuperuser = false, memberships = [] }) {
  const ownerMemberships = useMemo(() => memberships.filter(item => item.role === 'owner'), [memberships])
  const defaultOwnerOrgId = String(ownerMemberships[0]?.organization_id || '')
  const [venues, setVenues] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [configs, setConfigs] = useState([])
  const [feedback, setFeedback] = useState([])
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([])
  const [venueForm, setVenueForm] = useState(null)
  const [configForm, setConfigForm] = useState({ ...emptyConfig })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...emptyVenue, organization_id: defaultOwnerOrgId })
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
      setFeedback([])
      setSelectedFeedbackIds([])
      setVenueForm(null)
      setConfigForm({ ...emptyConfig })
    }
    setLoading(false)
  }

  async function loadVenue(id) {
    setError('')
    const [venuePayload, configPayloadResult, feedbackPayload] = await Promise.all([
      api(`/api/admin/venues/${id}/`),
      api(`/api/admin/venues/${id}/configs/`),
      api(`/api/admin/venues/${id}/feedback/`),
    ])
    const venue = venuePayload.venue
    const history = configPayloadResult.configs || []
    setFeedback(feedbackPayload.feedback || [])
    setSelectedFeedbackIds([])
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
    if (!platformSuperuser && !ownerMemberships.length) return
    setBusy('create')
    setError('')
    setSuccess('')
    try {
      const requestBody = platformSuperuser
        ? createForm
        : { ...createForm, organization_id: createForm.organization_id || defaultOwnerOrgId }
      const payload = await api('/api/admin/venues/', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
      setShowCreate(false)
      setCreateForm({ ...emptyVenue, organization_id: defaultOwnerOrgId })
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
    if (!selectedId || !venueForm || !canManageSelected) return
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
    if (!selectedId || !canManageSelected) return
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
    if (!selectedId || config.active || !canManageSelected) return
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

  async function createFeedbackDraft() {
    if (!selectedId || !canManageSelected || !selectedFeedbackIds.length) return
    setBusy('feedback-draft')
    setError('')
    setSuccess('')
    try {
      const result = await api(`/api/admin/venues/${selectedId}/feedback/draft-config/`, {
        method: 'POST',
        body: JSON.stringify({ feedback_ids: selectedFeedbackIds }),
      })
      setSuccess(`Draft configuration v${result.config.version} created from editor feedback. Review it below and activate it only if approved.`)
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
  const selectedRole = memberships.find(
    item => String(item.organization_id) === String(selectedVenue?.organization?.id || ''),
  )?.role
  const canManageSelected = platformSuperuser || selectedRole === 'owner'
  const canCreateVenue = platformSuperuser || ownerMemberships.length > 0

  if (loading) {
    return <div className="premium-card rounded-[28px] p-8 text-center text-[15px] font-semibold text-muted">Loading Venue Agents…</div>
  }

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div>
        <div className="text-[13px] font-extrabold uppercase tracking-[.15em] text-flexee-600">Editorial intelligence</div>
        <h2 className="serif mt-1 text-[43px] leading-none md:text-[54px]">Venue Agents</h2>
        <p className="mt-3 max-w-[850px] text-[16px] leading-7 text-muted">
          Configure venue identity, editorial scope, reviewer criteria, disclosure requirements and immutable configuration versions.
        </p>
      </div>
      {canCreateVenue && <button className="shine rounded-2xl bg-flexee-500 px-5 py-3 text-[14px] font-extrabold text-white shadow-orange hover:bg-flexee-600" type="button" onClick={() => setShowCreate(value => !value)}>
        {showCreate ? 'Close create form' : '+ Create venue'}
      </button>}
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[355px_minmax(0,1fr)]">
      <aside className="sidebar-content-card premium-card thin-scroll h-fit self-start rounded-[28px] p-4 xl:sticky xl:top-[94px] xl:max-h-[calc(100vh_-_112px)] xl:overflow-y-auto">
        <div className="mb-4 flex items-center justify-between px-2">
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-[.08em] text-flexee-600">Subscriber venues</div>
            <h3 className="serif mt-1 text-[30px]">{venues.filter(venue => venue.active).length} active</h3>
          </div>
          <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1.5 text-[13px] font-extrabold text-green-700">Healthy</span>
        </div>

        {showCreate && <form className="mb-4 space-y-3 rounded-[22px] border border-flexee-100 bg-gradient-to-br from-flexee-50 to-white p-4" onSubmit={createVenue}>
          <div className="text-[13px] font-extrabold uppercase tracking-[.08em] text-flexee-600">New venue</div>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-extrabold">Venue name</span>
            <input className="field" value={createForm.name} onChange={e => setCreateForm({...createForm, name:e.target.value})} required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-extrabold">Type</span>
              <select className="field" value={createForm.venue_type} onChange={e => setCreateForm({...createForm, venue_type:e.target.value})}><option value="journal">Journal</option><option value="conference">Conference</option><option value="publisher">Publisher</option></select>
            </label>
            {platformSuperuser
              ? <label className="block">
                  <span className="mb-1.5 block text-[14px] font-extrabold">Organization</span>
                  <input className="field" value={createForm.organization_name} onChange={e => setCreateForm({...createForm, organization_name:e.target.value})} />
                </label>
              : <label className="block">
                  <span className="mb-1.5 block text-[14px] font-extrabold">Organization</span>
                  <select className="field" value={createForm.organization_id || defaultOwnerOrgId} onChange={e => setCreateForm({...createForm, organization_id:e.target.value})} required>{ownerMemberships.map(item => <option key={String(item.organization_id)} value={String(item.organization_id)}>{item.organization__name}</option>)}</select>
                </label>}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-extrabold">Description</span>
            <textarea className="field min-h-[88px]" value={createForm.description} onChange={e => setCreateForm({...createForm, description:e.target.value})} />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="rounded-2xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="shine rounded-2xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create venue'}</button>
          </div>
        </form>}

        <div className="space-y-2">
          {venues.map(venue => {
            const active = selectedId === venue.id
            const longName = String(venue.name || '').length > 26
            return <button
              type="button"
              key={venue.id}
              className={`venue-item flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left ${active ? 'active border-line' : 'border-transparent hover:bg-flexee-50'}`}
              onClick={() => {
                setSelectedId(venue.id)
                loadVenue(venue.id).catch(err => setError(err.message))
              }}
            >
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-flexee-600 serif ${active ? 'bg-white shadow-sm' : 'bg-canvas'}`}>
                {venueInitial(venue.venue_type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className={longName ? 'text-[14px] font-extrabold leading-snug' : 'text-[15px] font-extrabold'}>{venue.name}</div>
                <div className={`${longName ? 'mt-1' : 'mt-0.5'} text-[13px] font-medium text-muted`}>{venueTypeLabel(venue.venue_type)} · {venue.active ? 'Active' : 'Inactive'}</div>
              </div>
              {venue.config?.version && <span className="rounded-full bg-green-50 px-2.5 py-1 text-[12px] font-extrabold text-green-700">v{venue.config.version}</span>}
            </button>
          })}
          {!venues.length && <div className="rounded-2xl border border-dashed border-line p-5 text-center text-[14px] font-semibold text-muted">No venues are configured yet.</div>}
        </div>
      </aside>

      <div className="space-y-5">
        {error && <div className="admin-error venue-admin-message">{error}</div>}
        {success && <div className="venue-admin-success venue-admin-message">{success}</div>}

        {!selectedVenue ? <div className="premium-card rounded-[28px] p-8 text-center">
          <div className="text-[13px] font-extrabold uppercase tracking-[.08em] text-flexee-600">No venue selected</div>
          <h3 className="serif mt-2 text-[30px]">Create or select a venue to configure its editorial agent.</h3>
        </div> : <>
          <div className="premium-card rounded-[28px] bg-gradient-to-r from-white via-white to-flexee-50/65 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[13px] font-extrabold uppercase tracking-[.09em] text-flexee-600">Venue Agent</div>
                <h3 className="serif mt-1 text-[41px] leading-none">{selectedVenue.name}</h3>
                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted">{selectedVenue.description || 'No description yet.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone={selectedVenue.active ? 'good' : 'warn'}>{selectedVenue.active ? 'Venue active' : 'Venue inactive'}</Pill>
                <Pill>{activeConfig ? `Config v${activeConfig.version}` : 'No config'}</Pill>
                {!canManageSelected && <Pill>Read only</Pill>}
              </div>
            </div>
          </div>

          <div className="grid items-start gap-5 2xl:grid-cols-[.72fr_1.28fr] 2xl:grid-rows-[auto_auto_1fr]">
            <form className="premium-card h-fit rounded-[28px] p-5 2xl:col-start-1 2xl:row-start-1" onSubmit={saveVenue}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">Identity</div>
                  <h4 className="serif mt-1 text-[31px]">Venue metadata</h4>
                </div>
                {canManageSelected && <button className="rounded-2xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={busy === 'venue'}>{busy === 'venue' ? 'Saving…' : 'Save metadata'}</button>}
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[14px] font-extrabold">Venue name</span>
                  <input className="field" value={venueForm?.name || ''} onChange={e => setVenueForm({...venueForm, name:e.target.value})} required />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[14px] font-extrabold">Venue type</span>
                  <select className="field" value={venueForm?.venue_type || 'journal'} onChange={e => setVenueForm({...venueForm, venue_type:e.target.value})}><option value="journal">Journal</option><option value="conference">Conference</option><option value="publisher">Publisher</option></select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[14px] font-extrabold">Description</span>
                  <textarea className="field min-h-[105px]" value={venueForm?.description || ''} onChange={e => setVenueForm({...venueForm, description:e.target.value})} />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50/80 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 accent-[#c7662d]" checked={Boolean(venueForm?.active)} onChange={e => setVenueForm({...venueForm, active:e.target.checked})} />
                  <span className="text-[14px] font-bold text-green-800">Active and visible to authors for matching</span>
                </label>
              </div>
            </form>

            <form className="premium-card rounded-[28px] p-5 2xl:col-start-2 2xl:row-span-3 2xl:row-start-1" onSubmit={createConfig}>
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-flexee-600">Editorial intelligence</div>
                  <h4 className="serif mt-1 text-[31px]">{activeConfig ? `Configuration v${activeConfig.version}` : 'No configuration yet'}</h4>
                  <div className="mt-1 text-[14px] leading-6 text-muted">New saves create immutable versions while historical submissions remain pinned.</div>
                </div>
                {canManageSelected && <button className="shine rounded-2xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={busy === 'config'}>{busy === 'config' ? 'Creating…' : activeConfig ? 'Create new version' : 'Create first config'}</button>}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Aims & scope" help={configFieldHelp.aims_scope} full><textarea className="field min-h-[105px]" value={configForm.aims_scope} onChange={e => setConfigForm({...configForm, aims_scope:e.target.value})} placeholder="What this venue publishes and the boundaries of its subject matter." /></Field>
                <Field label="Accepted article types" help={configFieldHelp.article_types}><textarea className="field min-h-[105px]" value={configForm.article_types} onChange={e => setConfigForm({...configForm, article_types:e.target.value})} placeholder="One per line. Example: Research article" /></Field>
                <Field label="Accepted methods" help={configFieldHelp.accepted_methods}><textarea className="field min-h-[105px]" value={configForm.accepted_methods} onChange={e => setConfigForm({...configForm, accepted_methods:e.target.value})} placeholder="Leave blank if method-neutral." /></Field>
                <Field label="Quality threshold" help={configFieldHelp.quality_threshold} full><textarea className="field min-h-[105px]" value={configForm.quality_threshold} onChange={e => setConfigForm({...configForm, quality_threshold:e.target.value})} /></Field>
                <Field label="Reviewer criteria" help={configFieldHelp.reviewer_criteria}><textarea className="field min-h-[125px]" value={configForm.reviewer_criteria} onChange={e => setConfigForm({...configForm, reviewer_criteria:e.target.value})} placeholder="Expertise areas, one per line." /></Field>
                <Field label="Required disclosures" help={configFieldHelp.disclosures}><textarea className="field min-h-[125px]" value={configForm.disclosures} onChange={e => setConfigForm({...configForm, disclosures:e.target.value})} placeholder="One per line." /></Field>
                <Field label="Reporting standards" help={configFieldHelp.reporting_standards}><textarea className="field min-h-[125px]" value={configForm.reporting_standards} onChange={e => setConfigForm({...configForm, reporting_standards:e.target.value})} placeholder="One per line." /></Field>
                <Field label="Desk-rejection guidance" help={configFieldHelp.desk_rejection_rules}><textarea className="field min-h-[125px]" value={configForm.desk_rejection_rules} onChange={e => setConfigForm({...configForm, desk_rejection_rules:e.target.value})} placeholder="Free-text guidance for the venue agent. One rule per line." /></Field>
                <Field label="Deterministic desk-rejection rules (JSON)" help={configFieldHelp.structured_desk_rejection_rules} full><textarea className="field venue-admin-code min-h-[160px]" value={configForm.structured_desk_rejection_rules} onChange={e => setConfigForm({...configForm, structured_desk_rejection_rules:e.target.value})} placeholder="Supported fields: word_count, reference_count, required_sections, manuscript_type, disclosure." /></Field>
                <Field label="Required submission items (JSON)" help={configFieldHelp.required_submission_items} full><textarea className="field venue-admin-code min-h-[160px]" value={configForm.required_submission_items} onChange={e => setConfigForm({...configForm, required_submission_items:e.target.value})} placeholder="Supported types: text, textarea, url, checkbox, file." /></Field>
                <Field label="Content retention (days)" help={configFieldHelp.retention_days}><input className="field" type="number" min="1" max="3650" step="1" value={configForm.retention_days} onChange={e => setConfigForm({...configForm, retention_days:e.target.value})} placeholder="Optional. Example: 365" /></Field>
                <Field label="Policies (JSON)" help={configFieldHelp.policies}><textarea className="field venue-admin-code min-h-[125px]" value={configForm.policies} onChange={e => setConfigForm({...configForm, policies:e.target.value})} placeholder="Structured venue policies in JSON." /></Field>
                <Field label="Current demand (JSON)" help={configFieldHelp.current_demand}><textarea className="field venue-admin-code min-h-[125px]" value={configForm.current_demand} onChange={e => setConfigForm({...configForm, current_demand:e.target.value})} placeholder="Special issues, tracks, priorities, or topics." /></Field>
                <Field label="Deadlines (JSON)" help={configFieldHelp.deadlines}><textarea className="field venue-admin-code min-h-[125px]" value={configForm.deadlines} onChange={e => setConfigForm({...configForm, deadlines:e.target.value})} /></Field>
                <Field label="Submission capacity (JSON)" help={configFieldHelp.submission_capacity}><textarea className="field venue-admin-code min-h-[125px]" value={configForm.submission_capacity} onChange={e => setConfigForm({...configForm, submission_capacity:e.target.value})} /></Field>
                <Field label="Configuration notes" help={configFieldHelp.config_notes}><textarea className="field min-h-[125px]" value={configForm.config_notes} onChange={e => setConfigForm({...configForm, config_notes:e.target.value})} /></Field>
              </div>
            </form>

            <div className="premium-card h-fit rounded-[28px] p-5 2xl:col-start-1 2xl:row-start-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">Editor feedback</div>
                  <h4 className="serif mt-1 text-[30px]">Venue-specific learning queue</h4>
                </div>
                {canManageSelected && selectedFeedbackIds.length > 0 && <button className="shine rounded-2xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={createFeedbackDraft} disabled={busy === 'feedback-draft'}>{busy === 'feedback-draft' ? 'Creating draft…' : `Create draft from ${selectedFeedbackIds.length} selected`}</button>}
              </div>

              <div className="mt-4 space-y-3">
                {feedback.length ? feedback.map(item => {
                  const selectable = item.draftable && !item.applied_to_config_version && canManageSelected
                  const selected = selectedFeedbackIds.includes(item.id)
                  return <div key={item.id} className="rounded-2xl border border-line bg-[#fcfaf8] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectable && <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#c7662d]"
                        checked={selected}
                        onChange={e => setSelectedFeedbackIds(current => e.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}
                        aria-label={`Select ${item.assessment_field} feedback`}
                      />}
                      <span className="text-[16px] font-extrabold">{venueTypeLabel(String(item.assessment_field || '').replaceAll('_', ' '))}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[13px] font-extrabold ${item.draftable ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-muted'}`}>{item.draftable ? 'Venue rule' : 'Assessment only'}</span>
                      {item.applied_to_config_version && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[13px] font-extrabold text-muted">Draft v{item.applied_to_config_version}</span>}
                    </div>
                    <p className="mt-2 text-[14px] leading-6 text-muted">{item.reason || 'No reason recorded.'}</p>
                    <div className="mt-2 text-[13px] font-semibold text-[#8d8179]">{formatDate(item.created_at)}{item.venue_config_version ? ` · Config v${item.venue_config_version}` : ''}</div>
                  </div>
                }) : <div className="rounded-2xl border border-dashed border-line p-5 text-center text-[14px] font-semibold text-muted">No editor feedback has been recorded for this venue yet.</div>}
              </div>
            </div>

            <div className="premium-card h-fit rounded-[28px] p-5 2xl:col-start-1 2xl:row-start-3">
              <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">Audit trail</div>
              <h4 className="serif mt-1 text-[30px]">Configuration history</h4>

              <div className="mt-4 space-y-3">
                {configs.map(config => <div key={config.id} className={`rounded-2xl border p-4 ${config.active ? 'border-green-100 bg-green-50/60' : 'border-line bg-[#fcfaf8]'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl text-[13px] font-extrabold ${config.active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-muted'}`}>
                        v{config.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-extrabold">Version {config.version}</span>
                          {config.active && <span className="rounded-full bg-green-100 px-2 py-1 text-[12px] font-extrabold text-green-700">Active</span>}
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-muted">{formatDate(config.created_at)} · {formatTime(config.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold" type="button" onClick={() => setConfigForm(configToForm(config))}>Load into editor</button>
                      {!config.active && canManageSelected && <button className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={busy === `activate-${config.id}`} onClick={() => activateConfig(config)}>{busy === `activate-${config.id}` ? 'Activating…' : 'Reactivate'}</button>}
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] leading-6 text-muted">{config.aims_scope || 'No aims and scope recorded.'}</p>
                </div>)}
                {!configs.length && <div className="rounded-2xl border border-dashed border-line p-5 text-center text-[14px] font-semibold text-muted">No Venue Agent configuration has been created yet.</div>}
              </div>
            </div>
          </div>
        </>}
      </div>
    </div>
  </div>
}
