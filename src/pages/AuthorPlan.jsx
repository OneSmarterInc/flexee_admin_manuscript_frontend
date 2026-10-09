import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorPageError } from '../components/AuthorFlow.jsx'
import VenueTrustBadge from '../components/VenueTrust.jsx'
import { authorApi, currentManuscriptPath, friendlyAuthorError, getAuthorSession } from '../authorApi.js'

/* The ordered submission plan (instruction 2.5). One venue at a time; a decline stops and asks.
   Effort is shown in words; no percentages, scores or colour scales, by policy. */

const NEXT_STEP = {
  queued: 'Not started',
  preparing: 'Preparing to send',
  submitted: 'Sent, waiting for the venue',
  under_review: 'Under review',
  revise_resubmit: 'Venue asked for a revision',
  awaiting_author: 'Declined: your answer is needed',
  accepted: 'Accepted',
  closed: 'Closed',
  skipped: 'Skipped',
  withdrawn: 'Withdrawn',
}

function post(planId, positionId, action, body = {}) {
  return authorApi(`/api/author/plans/${planId}/positions/${positionId}/${action}/`, { method: 'POST', body: JSON.stringify(body) })
}

function Changes({ position }) {
  if (!position.changes?.length) return <p className="pl-ready">Nothing to change for this venue.</p>
  return <ul className="pl-changes">
    {position.changes.map((change, index) => <li key={index}>
      <span className="pl-kind">{change.kind}</span>
      <span>{change.message}</span>
    </li>)}
  </ul>
}

function DeclinePrompt({ plan, position, currentVersion, onDone, setError }) {
  const [mode, setMode] = useState('')
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const baseline = position.submitted_version || plan.built_on_version
  const hasNewer = currentVersion && currentVersion > baseline

  async function answer(body) {
    setBusy(true)
    setError('')
    try { onDone((await post(plan.id, position.id, 'answer', body)).plan) } catch (err) { setError(friendlyAuthorError(err)) } finally { setBusy(false) }
  }

  return <div className="pl-decline" role="region" aria-label="Declined: your answer is needed">
    <h3>{position.venue.name} declined the manuscript.</h3>
    <p>The plan waits here. Sending the same text to the next venue usually repeats the same problems, so first say whether you revised it.</p>
    <div className="pl-choices">
      <button type="button" className={`md2-btn ${mode === 'revised' ? 'primary' : ''}`} onClick={() => setMode('revised')}>I revised it</button>
      <button type="button" className={`md2-btn ${mode === 'unchanged' ? 'primary' : ''}`} onClick={() => setMode('unchanged')}>Send it unchanged</button>
      <button type="button" className="md2-btn" onClick={() => go('/author/manuscript-details')}>Upload a revised version</button>
    </div>
    {mode === 'revised' && <div className="pl-answer">
      {hasNewer
        ? <><p>The next venue gets <b>version {currentVersion}</b>. The remaining venues are re-checked against it and may change order.</p>
          <button type="button" className="md2-btn primary" disabled={busy} onClick={() => answer({ answer: 'revised', version: currentVersion })}>Continue with version {currentVersion}</button></>
        : <p>Upload the revised version first (Manuscript details → Upload revised version), then run the readiness check and venue matching for it.</p>}
    </div>}
    {mode === 'unchanged' && <div className="pl-answer">
      <label>Why should the next venue get the same text?
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="For example: a desk decision on scope only, with no reviewer comments to act on." />
      </label>
      <label className="pl-check"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
        I confirm the next venue gets the manuscript {position.venue.name} declined, unchanged.</label>
      <button type="button" className="md2-btn primary" disabled={busy || reason.trim().length < 20 || !confirm}
        onClick={() => answer({ answer: 'unchanged', reason, confirm: true })}>Continue unchanged</button>
    </div>}
  </div>
}

function CurrentStep({ plan, position, currentVersion, onDone, setError }) {
  const [busy, setBusy] = useState(false)
  const [skipReason, setSkipReason] = useState('')
  const [showSkip, setShowSkip] = useState(false)

  async function run(action, body) {
    setBusy(true)
    setError('')
    try { onDone((await post(plan.id, position.id, action, body)).plan) } catch (err) { setError(friendlyAuthorError(err)) } finally { setBusy(false) }
  }

  if (position.state === 'awaiting_author') {
    return <DeclinePrompt plan={plan} position={position} currentVersion={currentVersion} onDone={onDone} setError={setError} />
  }
  return <div className="pl-actions">
    {position.state === 'queued' && <>
      <button type="button" className="md2-btn primary" disabled={busy} onClick={() => run('start')}>Start with this venue</button>
      <button type="button" className="md2-btn" onClick={() => setShowSkip(v => !v)}>Skip this venue</button>
      {showSkip && <div className="pl-answer">
        <label>Why skip it?<input value={skipReason} onChange={e => setSkipReason(e.target.value)} placeholder="For example: the editor is a co-author." /></label>
        <button type="button" className="md2-btn" disabled={busy || skipReason.trim().length < 5} onClick={() => run('skip', { reason: skipReason })}>Skip</button>
      </div>}
    </>}
    {position.state === 'preparing' && <>
      <p className="pl-help">Make the changes listed, then send it to the venue. Venues on Flexee update this plan by themselves; for other venues, mark it here once sent.</p>
      <button type="button" className="md2-btn primary" disabled={busy} onClick={() => run('submitted')}>I have sent it</button>
    </>}
    {['submitted', 'under_review'].includes(position.state) && <>
      {position.state === 'submitted' && <button type="button" className="md2-btn" disabled={busy} onClick={() => run('under-review')}>It is under review</button>}
      <span className="pl-help">When the venue decides, record it:</span>
      <button type="button" className="md2-btn" disabled={busy} onClick={() => run('outcome', { outcome: 'accepted' })}>Accepted</button>
      <button type="button" className="md2-btn" disabled={busy} onClick={() => run('outcome', { outcome: 'revise_resubmit' })}>Asked for a revision</button>
      <button type="button" className="md2-btn" disabled={busy} onClick={() => run('outcome', { outcome: 'declined' })}>Declined</button>
      <button type="button" className="md2-btn" disabled={busy} onClick={() => run('outcome', { outcome: 'withdrawn' })}>I withdrew it</button>
    </>}
    {position.state === 'revise_resubmit' && <>
      <p className="pl-help">Upload the revised version, then resubmit it to {position.venue.name}.</p>
      {currentVersion > (position.submitted_version || 0)
        ? <button type="button" className="md2-btn primary" disabled={busy} onClick={() => run('resubmit', { version: currentVersion })}>Resubmit version {currentVersion}</button>
        : <button type="button" className="md2-btn" onClick={() => go('/author/manuscript-details')}>Upload a revised version</button>}
    </>}
  </div>
}

export default function AuthorPlan() {
  const [plan, setPlan] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const [building, setBuilding] = useState(false)

  async function load() {
    try {
      const payload = await authorApi(currentManuscriptPath('/plan/'))
      setPlan(payload.plan)
      setCurrentVersion(payload.current_version)
    } catch (err) {
      setPageError(friendlyAuthorError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!getAuthorSession().manuscriptId) {
      setPageError('No manuscript is selected. Return to the author workspace and choose a manuscript.')
      setLoading(false)
      return
    }
    load()
  }, [])

  async function build(replace = false) {
    setBuilding(true)
    setError('')
    try {
      const payload = await authorApi(currentManuscriptPath('/plan/'), { method: 'POST', body: JSON.stringify({ replace }) })
      setPlan(payload.plan)
    } catch (err) {
      const code = err?.payload?.code
      setError(friendlyAuthorError(err) + (code === 'readiness_needed' || code === 'matches_needed' ? ' ' : ''))
    } finally {
      setBuilding(false)
    }
  }

  const current = plan?.positions?.find(p => p.id === plan.current_position_id) || null
  const outdated = plan && currentVersion && plan.status === 'active' && currentVersion > plan.built_on_version
    && !plan.positions.some(p => ['submitted', 'under_review', 'revise_resubmit', 'awaiting_author'].includes(p.state))

  return <PublicationShell>
    <div className="wrap author-flow-page md2 pl-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Submission plan</div>
      <AuthorPageError title="Plan unavailable." message={pageError} empty={!loading && !plan && !!pageError} />

      {loading ? <section className="md2-card"><div className="md2-sec-body"><p className="md2-empty">Loading the plan…</p></div></section> : !pageError && <>
        <section className="md2-card">
          <div className="md2-sec-head">
            <div><p className="kicker">Submission plan</p><h2>{plan ? 'Where to send it, in order' : 'No plan yet'}</h2></div>
            <div className="pl-head-actions">
              {plan && plan.status !== 'active' && <span className="pl-status">{plan.status === 'completed' ? 'Accepted' : 'Stopped'}</span>}
              {(!plan || plan.status !== 'active' || outdated) && <button type="button" className="md2-btn primary" disabled={building} onClick={() => build(Boolean(plan && plan.status === 'active'))}>
                {building ? 'Building…' : plan ? 'Build a plan for the current version' : 'Build my plan'}
              </button>}
            </div>
          </div>
          <div className="md2-sec-body">
            <p className="pl-help">{plan?.how_ordered || 'The plan orders the matched venues by how much the manuscript must change for each one, then by how close their scope is. You send to one venue at a time.'}</p>
            {plan && <p className="pl-meta">Built for version {plan.built_on_version}{currentVersion && currentVersion !== plan.built_on_version ? ` · current version is ${currentVersion}` : ''}</p>}
            {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}
              {(error.includes('readiness') || error.includes('matching')) && <> <button type="button" className="author-text-link" onClick={() => go(error.includes('readiness') ? '/author/readiness' : '/author/venues')}>Go there</button></>}
            </div>}
          </div>
        </section>

        {plan && current && plan.status === 'active' && <section className="md2-card pl-current">
          <div className="md2-sec-head">
            <div><p className="kicker">Now · step {current.order} of {plan.positions.length}</p><h2>{current.venue.name}</h2></div>
            <span className="pl-status">{NEXT_STEP[current.state]}</span>
          </div>
          <div className="md2-sec-body">
            <VenueTrustBadge venue={current.venue} />
            <div className="md2-note"><b>Why here</b>{current.reason}</div>
            <div className="pl-block"><b>Before sending</b><Changes position={current} /></div>
            <CurrentStep plan={plan} position={current} currentVersion={currentVersion} onDone={setPlan} setError={setError} />
          </div>
        </section>}

        {plan && <section className="md2-card">
          <div className="md2-sec-head"><div><p className="kicker">The sequence</p><h2>All venues in this plan</h2></div></div>
          <ol className="pl-list">
            {plan.positions.map(position => <li key={position.id} className={position.id === plan.current_position_id ? 'now' : ''}>
              <div className="pl-num">{position.order}</div>
              <div className="pl-body">
                <div className="pl-line">
                  <b>{position.venue.name}</b>
                  <span className="pl-kind">{position.effort}</span>
                  <span className="pl-state">{NEXT_STEP[position.state]}</span>
                </div>
                <p className="pl-reason">{position.reason}</p>
                {position.changes?.length > 0 && <details><summary>Changes for this venue ({position.changes.length})</summary><Changes position={position} /></details>}
                {position.unchanged_reason && <p className="pl-meta">Sent on unchanged: {position.unchanged_reason}</p>}
                {position.skip_reason && <p className="pl-meta">Skipped: {position.skip_reason}</p>}
                {position.revision_version && <p className="pl-meta">Revised as version {position.revision_version}</p>}
              </div>
            </li>)}
          </ol>
        </section>}

        {plan?.not_included?.length > 0 && <section className="md2-card">
          <details className="md2-details pl-left-out">
            <summary><span>Not included <em>{plan.not_included.length}</em></span><i aria-hidden="true">▾</i></summary>
            <div className="md2-list">
              {plan.not_included.map(item => <div key={item.venue_id} className="md2-list-item"><div><b>{item.venue}</b><small>{item.reason}</small></div></div>)}
            </div>
          </details>
        </section>}

        {plan?.events?.length > 0 && <section className="md2-card">
          <details className="md2-details">
            <summary><span>Plan history <em>{plan.events.length}</em></span><i aria-hidden="true">▾</i></summary>
            <div className="md2-list">
              {plan.events.slice().reverse().map((event, index) => <div key={index} className="md2-list-item"><div>
                <b>{event.action.replaceAll('_', ' ')}{event.actor === 'venue' ? ' (by the venue)' : ''}</b>
                <small>{new Date(event.at).toLocaleString()}{event.note ? ` · ${event.note}` : ''}</small>
              </div></div>)}
            </div>
          </details>
        </section>}

        {plan?.status === 'active' && <div className="pl-footer">
          <button type="button" className="md2-btn" onClick={async () => {
            if (!window.confirm('Stop this plan? Venues already contacted are not affected.')) return
            try { setPlan((await authorApi(`/api/author/plans/${plan.id}/stop/`, { method: 'POST', body: '{}' })).plan) } catch (err) { setError(friendlyAuthorError(err)) }
          }}>Stop the plan</button>
          <button type="button" className="md2-btn" onClick={() => go('/author/manuscript-details')}>Manuscript details</button>
        </div>}
      </>}
    </div>
  </PublicationShell>
}
