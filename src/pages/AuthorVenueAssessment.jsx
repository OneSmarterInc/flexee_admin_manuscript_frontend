import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import {
  authorApi,
  currentManuscriptPath,
  friendlyAuthorError,
  getAuthorSession,
  saveAuthorSession,
  pollAuthorJob,
} from '../authorApi.js'

function routeSlug() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  return parts[parts.length - 1] === 'venue-assessment' ? '' : parts[parts.length - 1]
}

function eligibilityTone(value) {
  return value === 'eligible' ? 'good' : value === 'needs_changes' ? 'warn' : 'neutral'
}

function eligibilityLabel(value) {
  return value === 'eligible' ? 'Eligible' : value === 'needs_changes' ? 'Needs changes' : value === 'ineligible' ? 'Not eligible' : 'Review'
}

function displayJson(value) {
  if (!value) return 'Not configured'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not configured'
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    return entries.length ? entries.map(([key, item]) => `${key.replaceAll('_', ' ')}: ${Array.isArray(item) ? item.join(', ') : String(item)}`).join(' · ') : 'Not configured'
  }
  return String(value)
}

export default function AuthorVenueAssessment() {
  const slug = routeSlug()
  const [match, setMatch] = useState(null)
  const [venue, setVenue] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const session = getAuthorSession()
    if (!session.manuscriptId || !session.accessToken) {
      setError('No secure manuscript session is available. Start a new submission.')
      setLoading(false)
      return
    }

    try {
      const [matchPayload, venuePayload] = await Promise.all([
        authorApi(currentManuscriptPath('/matches/')),
        api('/api/author/venues/'),
      ])
      const currentMatch = (matchPayload.matches || []).find(item => item.venue.slug === slug)
      const currentVenue = (venuePayload.venues || []).find(item => item.slug === slug)
      setMatch(currentMatch || null)
      setVenue(currentVenue || currentMatch?.venue || null)

      if (session.submissionId && session.selectedVenueSlug === slug) {
        try {
          const submissionPayload = await authorApi(`/api/author/venue-submissions/${session.submissionId}/`)
          setSubmission(submissionPayload.submission)
        } catch (err) {
          if (err.status === 404) {
            saveAuthorSession({ submissionId: null })
          } else {
            throw err
          }
        }
      }
    } catch (err) {
      setError(friendlyAuthorError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [slug])

  async function chooseAndAssess() {
    if (!match?.venue?.id) return
    setBusy(true)
    setError('')

    try {
      let current = submission
      if (!current || current.venue?.id !== match.venue.id) {
        const created = await authorApi(currentManuscriptPath('/submissions/'), {
          method: 'POST',
          body: JSON.stringify({ venue_id: match.venue.id }),
        })
        current = created.submission
        setSubmission(current)
        saveAuthorSession({
          submissionId: current.id,
          selectedVenueId: match.venue.id,
          selectedVenueSlug: match.venue.slug,
        })
      }

      if (!current.editorial_brief || !Object.keys(current.editorial_brief).length) {
        const resp = await authorApi(`/api/author/venue-submissions/${current.id}/assessment/run/`, {
          method: 'POST',
        })
        if (resp.job_id) await pollAuthorJob(resp.job_id)
        const assessed = await authorApi(`/api/author/venue-submissions/${current.id}/`)
        current = assessed.submission
        setSubmission(current)
      }
    } catch (err) {
      setError(friendlyAuthorError(err))
    } finally {
      setBusy(false)
    }
  }

  const brief = submission?.editorial_brief || {}
  const sections = useMemo(() => ([
    ['Outlet fit', brief.outlet_fit],
    ['Policy compliance', brief.policy_compliance],
    ['Contribution', brief.contribution],
    ['Methods', brief.methods],
    ['Citation integrity', brief.citation_integrity],
  ]).filter(([, value]) => value?.summary), [brief])

  const assessed = Boolean(submission?.editorial_brief && Object.keys(submission.editorial_brief).length)

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / <button className="author-text-link" type="button" onClick={() => go('/author/venues')}>Venue matches</button> / Venue review</div>
      <AuthorFlowNav active="assessment" />
      <AuthorPrototypeNotice />

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Venue assessment could not finish.</b> {error}</div>}

      {loading ? <section className="author-panel author-live-state"><p className="kicker">Venue review</p><h2>Loading venue configuration…</h2></section> :
        !match || !venue ? <section className="author-panel author-live-state">
          <p className="kicker">Venue unavailable</p>
          <h2>This venue is not in the current manuscript match set.</h2>
          <button className="author-secondary-button" type="button" onClick={() => go('/author/venues')}>Back to venue matches</button>
        </section> : <>
          <div className="author-page-heading author-heading-row">
            <div>
              <p className="kicker">{assessed ? 'Venue assessment' : 'Venue review'}</p>
              <span className="author-venue-type">{venue.venue_type}</span>
              <h1 className="publication-title">{venue.name}</h1>
              <p className="publication-lede">{assessed ? (brief.editor_summary || match.fit_summary) : match.fit_summary}</p>
            </div>
            <div className="author-assessment-choice">
              <AuthorStatusPill tone={eligibilityTone(match.eligibility)}>{eligibilityLabel(match.eligibility)}</AuthorStatusPill>
              {!assessed ? <button className="copper-button" type="button" onClick={chooseAndAssess} disabled={busy || match.eligibility === 'ineligible'}>
                {busy ? 'Preparing assessment…' : 'Choose venue & prepare packet'}
              </button> : <button className="copper-button" type="button" onClick={() => go('/author/status')}>Continue to submission status</button>}
              <small>{assessed ? 'The venue-specific packet is prepared for your review.' : 'You choose the destination. Selecting it creates the venue submission and runs the venue-specific assessment.'}</small>
            </div>
          </div>

          <section className="author-venue-context">
            <div><span>Scope</span><p>{venue.config?.aims_scope || venue.description || 'Not configured'}</p></div>
            <div><span>Article types</span><p>{displayJson(venue.config?.article_types)}</p></div>
            <div><span>Current demand</span><p>{displayJson(venue.config?.current_demand)}</p></div>
          </section>

          <div className="author-report-grid">
            <section className="author-panel author-report-panel">
              <div className="author-panel-heading">
                <div><p className="kicker">{assessed ? 'Editorial brief' : 'Matching explanation'}</p><h2>{assessed ? 'Venue-specific assessment' : 'Why this venue may or may not fit'}</h2></div>
              </div>

              {assessed ? <div className="author-assessment-list">
                {sections.map(([label, value]) => <article key={label}>
                  <div><span>{label}</span><b>{(value.venue_fields || []).join(', ') || 'Manuscript evidence'}</b></div>
                  <p>{value.summary}</p>
                </article>)}
                {brief.unresolved_risks?.length > 0 && <article>
                  <div><span>Unresolved risks</span><b>Human review</b></div>
                  <ul>{brief.unresolved_risks.map((item, index) => <li key={index}>{item.risk}</li>)}</ul>
                </article>}
                {brief.reviewer_expertise?.length > 0 && <article>
                  <div><span>Reviewer expertise</span><b>Suggested areas</b></div>
                  <p>{brief.reviewer_expertise.join(', ')}</p>
                </article>}
              </div> : <div className="author-match-columns">
                <div>
                  <h3>Why it may fit</h3>
                  {match.reasons?.length ? <ul>{match.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : <p className="author-muted-copy">No positive alignment recorded yet.</p>}
                </div>
                <div>
                  <h3>Before submission</h3>
                  {match.gaps?.length ? <ul className="gaps">{match.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul> : <p className="author-muted-copy">No venue-specific gaps recorded.</p>}
                </div>
              </div>}
            </section>

            <aside className="author-sidebar">
              <section className="author-panel author-evidence-card">
                <p className="kicker">Evidence trail</p>
                <h2>Why the system says this</h2>
                <div className="author-evidence-list">
                  {(assessed ? submission.evidence : match.evidence || []).length ? (assessed ? submission.evidence : match.evidence).map((item, index) => <article key={item.id || index}>
                    <h3>{item.finding_type || item.finding || 'Evidence'}</h3>
                    <span>{item.source_locator || item.source_type}</span>
                    <p>{item.claim || item.excerpt || 'Evidence attached to this finding.'}</p>
                    {item.excerpt && item.claim && <small>{item.excerpt}</small>}
                  </article>) : <p className="author-muted-copy">No evidence rows are available yet.</p>}
                </div>
              </section>
              <section className="author-panel author-human-card">
                <span className="author-human-pill">{assessed ? 'Human decision' : 'Author choice'}</span>
                <h2>{assessed ? 'Editors decide.' : 'No automatic routing.'}</h2>
                <p>{assessed ? 'The AI-generated brief supports editorial review; it does not make the publication decision.' : 'Review the fit and gaps, then choose whether this is the destination you want.'}</p>
              </section>
            </aside>
          </div>

          <div className="author-bottom-actions">
            <button className="author-secondary-button" type="button" onClick={() => go('/author/venues')}>Compare other venues</button>
            {assessed ? <button className="copper-button" type="button" onClick={() => go('/author/status')}>Continue to status</button> :
              <button className="copper-button" type="button" onClick={chooseAndAssess} disabled={busy || match.eligibility === 'ineligible'}>{busy ? 'Preparing…' : `Choose ${venue.name}`}</button>}
          </div>
        </>}
    </div>
  </PublicationShell>
}
