import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { authorApi, currentManuscriptPath, friendlyAuthorError, getAuthorSession, saveAuthorSession, pollAuthorJob } from '../authorApi.js'

function toneForEligibility(value) {
  if (value === 'eligible') return 'good'
  if (value === 'needs_changes') return 'warn'
  return 'neutral'
}

function labelForEligibility(value) {
  if (value === 'eligible') return 'Eligible'
  if (value === 'needs_changes') return 'Needs changes'
  if (value === 'ineligible') return 'Not eligible'
  return 'Review'
}

export default function AuthorVenueMatches() {
  const [manuscript, setManuscript] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [agentBusy, setAgentBusy] = useState(false)
  const [error, setError] = useState('')
  const [agentWarning, setAgentWarning] = useState('')

  async function loadMatches() {
    const session = getAuthorSession()
    if (!session.manuscriptId) {
      setError('No manuscript is selected. Return to the author workspace and choose a manuscript.')
      setLoading(false)
      return
    }

    try {
      const manuscriptPayload = await authorApi(currentManuscriptPath('/'))
      const currentManuscript = manuscriptPayload.manuscript
      setManuscript(currentManuscript)

      let payload = await authorApi(currentManuscriptPath('/matches/'))
      let items = payload.matches || []

      if (!items.length) {
        payload = await authorApi(currentManuscriptPath('/matches/run/'), { method: 'POST' })
        items = payload.matches || []
      }

      setMatches(items)
      setLoading(false)

      const alreadySemantic = items.some(match =>
        (match.evidence || []).some(item => item.source_type === 'manuscript_profile')
      )
      const hasSemanticProfile = Boolean(currentManuscript?.parsed_profile?.semantic)

      if (items.length && hasSemanticProfile && !alreadySemantic) {
        await runSemanticMatching()
      } else if (items.length && !hasSemanticProfile) {
        setAgentWarning('Semantic readiness is not available, so these results show the deterministic venue-policy checks only.')
      }
    } catch (err) {
      setError(friendlyAuthorError(err))
      setLoading(false)
    }
  }

  async function runSemanticMatching() {
    setAgentBusy(true)
    setAgentWarning('')
    try {
      const resp = await authorApi(currentManuscriptPath('/matches/semantic/'), {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (resp.job_id) await pollAuthorJob(resp.job_id)
      const payload = await authorApi(currentManuscriptPath('/matches/'))
      setMatches(payload.matches || [])
    } catch (err) {
      setAgentWarning(`Semantic matching could not finish: ${friendlyAuthorError(err)} Deterministic venue checks remain available.`)
    } finally {
      setAgentBusy(false)
    }
  }

  useEffect(() => {
    loadMatches()
  }, [])

  function openVenue(match) {
    saveAuthorSession({
      selectedVenueId: match.venue.id,
      selectedVenueSlug: match.venue.slug,
    })
    go(`/author/venue-assessment/${match.venue.slug}`)
  }

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Venue matches</div>
      <AuthorFlowNav active="venues" />
      <AuthorPrototypeNotice />

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Venue matching unavailable.</b> {error}</div>}

      <section className="author-venues-hero">
        <div>
          <p className="kicker">Venue matching</p>
          <h1 className="publication-title">Compare fit before you choose.</h1>
          <p className="publication-lede">Each participating venue is checked against the manuscript independently. The system explains alignment and gaps; it does not rank destinations or choose one for you.</p>
        </div>
        <div className="author-venues-summary" aria-label="Venue matching summary">
          <div><span>Venues</span><b>{matches.length}</b></div>
          <div><span>Eligible</span><b>{matches.filter(item => item.eligibility === 'eligible').length}</b></div>
          <div><span>Needs changes</span><b>{matches.filter(item => item.eligibility === 'needs_changes').length}</b></div>
        </div>
      </section>

      {agentBusy && <div className="author-prototype-notice" role="status"><b>Semantic matching is running.</b> The agent is evaluating each configured venue independently.</div>}
      {agentWarning && <div className="author-prototype-notice author-error-banner" role="note"><b>Matching note.</b> {agentWarning} {!agentBusy && manuscript?.parsed_profile?.semantic && <button className="author-text-link author-inline-action" type="button" onClick={runSemanticMatching}>Retry semantic matching</button>}</div>}

      {loading ? <section className="author-panel author-live-state"><p className="kicker">Venue matching</p><h2>Loading participating venues…</h2></section> :
        matches.length ? <section className="author-panel author-venue-table-card">
          <div className="author-venue-table-head">
            <div>
              <p className="kicker">Participating venues</p>
              <h2>Venue comparison</h2>
            </div>
            <span>{matches.length} venue{matches.length === 1 ? '' : 's'}</span>
          </div>
          <div className="author-venue-table-wrap">
            <table className="author-venue-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Venue</th>
                  <th>Status</th>
                  <th>Fit summary</th>
                  <th>Why it may fit</th>
                  <th>Before submission</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, index) => <tr key={match.id}>
                  <td><span className="author-venue-row-index">{String(index + 1).padStart(2, '0')}</span></td>
                  <td>
                    <span className="author-venue-type">{match.venue.venue_type}</span>
                    <b className="author-venue-table-name">{match.venue.name}</b>
                  </td>
                  <td>
                    <AuthorStatusPill tone={toneForEligibility(match.eligibility)}>{labelForEligibility(match.eligibility)}</AuthorStatusPill>
                  </td>
                  <td><p className="author-venue-table-summary">{match.fit_summary || 'Venue configuration is available for review.'}</p></td>
                  <td>
                    {match.reasons?.length ? <ul className="author-venue-table-list">{match.reasons.map((reason, reasonIndex) => <li key={`${match.id}-reason-${reasonIndex}`}>{reason}</li>)}</ul> : <span className="author-venue-table-empty">No positive alignment recorded.</span>}
                  </td>
                  <td>
                    {match.gaps?.length ? <ul className="author-venue-table-list gaps">{match.gaps.map((gap, gapIndex) => <li key={`${match.id}-gap-${gapIndex}`}>{gap}</li>)}</ul> : <span className="author-venue-table-empty">No venue-specific gaps.</span>}
                  </td>
                  <td>
                    <button className="author-secondary-button author-venue-table-action" type="button" onClick={() => openVenue(match)}>
                      Review
                    </button>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section> : !error && <section className="author-panel author-live-state">
          <p className="kicker">No matches yet</p>
          <h2>No active participating venues are configured.</h2>
          <p className="author-muted-copy">An administrator needs to create and activate venue configurations before this manuscript can be matched.</p>
        </section>
      }

      <div className="author-bottom-actions">
        <button className="author-secondary-button" type="button" onClick={() => go('/author/readiness')}>Back to readiness</button>
        {matches.length > 0 && manuscript?.parsed_profile?.semantic && <button className="author-secondary-button" type="button" onClick={runSemanticMatching} disabled={agentBusy}>{agentBusy ? 'Refreshing…' : 'Refresh semantic explanations'}</button>}
      </div>
    </div>
  </PublicationShell>
}
