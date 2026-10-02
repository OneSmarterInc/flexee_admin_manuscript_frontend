import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { authorApi, currentManuscriptPath, friendlyAuthorError, getAuthorSession, saveAuthorSession, pollAuthorJob } from '../authorApi.js'

function toneForEligibility(value) {
  if (value === 'eligible') return 'good'
  if (value === 'needs_changes') return 'warn'
  return 'neutral'
}

function scoreTone(score) {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'good'
  if (score >= 35) return 'partial'
  return 'low'
}

const SCORE_HELP = 'How the match score is built from your manuscript: scope fit with the venue\'s aims and topics (40%), accepted article type (25%), venue requirements met such as length and sections (20%), methods and quality signals (15%). It explains fit only; it is not a quality ranking.'

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
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('score')

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
          <p className="publication-lede">Each participating venue is checked against the manuscript independently. The match score explains how well it fits and what would need to change; you choose the destination.</p>
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
        matches.length ? <section className="author-venue-card-section">
          <div className="author-venue-card-section-head">
            <div>
              <p className="kicker">Participating venues</p>
              <h2>Venue comparison</h2>
            </div>
            <span>{matches.length} venue{matches.length === 1 ? '' : 's'}</span>
          </div>

          <div className="author-mtable-toolbar">
            <div className="author-mtable-tabs" role="tablist" aria-label="Filter venues">
              {[['all', 'All', matches.length],
                ['eligible', 'Eligible', matches.filter(m => m.eligibility === 'eligible').length],
                ['needs_changes', 'Needs changes', matches.filter(m => m.eligibility === 'needs_changes').length],
                ['ineligible', 'Not eligible', matches.filter(m => m.eligibility === 'ineligible').length]]
                .map(([key, label, count]) => <button key={key} type="button" role="tab" aria-selected={filter === key}
                  className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label} · {count}</button>)}
            </div>
            <select className="author-mtable-sort" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort venues">
              <option value="score">Sort: highest match</option>
              <option value="name">Sort: venue name</option>
            </select>
          </div>

          <div className="author-mtable-table-wrap">
            <table className="author-mtable-table">
              <thead>
                <tr>
                  <th>Venue</th>
                  <th><span className="author-mtable-help" tabIndex={0} title={SCORE_HELP} aria-label={SCORE_HELP}>Match ⓘ</span></th>
                  <th>Status</th>
                  <th>Why it may fit</th>
                  <th>Before submission</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {matches
                  .filter(match => filter === 'all' || match.eligibility === filter)
                  .slice()
                  .sort((a, b) => sort === 'name'
                    ? a.venue.name.localeCompare(b.venue.name)
                    : (b.match_score?.score ?? -1) - (a.match_score?.score ?? -1))
                  .map(match => {
                    const score = match.match_score?.score ?? null
                    const tone = score === null ? 'low' : scoreTone(score)
                    return <tr key={match.id}>
                      <td>
                        <b className="author-mtable-venue">{match.venue.name}</b>
                        <span className="author-mtable-meta">{match.venue.venue_type}{match.venue.organization?.name ? ` · ${match.venue.organization.name}` : ''}</span>
                      </td>
                      <td className={`author-mtable-score ${tone}`}
                        title={match.match_score ? `Scope ${match.match_score.breakdown.scope}/40 · Type ${match.match_score.breakdown.type}/25 · Requirements ${match.match_score.breakdown.requirements}/20 · Methods ${match.match_score.breakdown.methods}/15` : ''}>
                        {score === null ? <span className="author-mtable-meta">Not scored</span> : <>
                          <div><strong>{score}%</strong><em>{match.match_score.label}</em></div>
                          <div className="author-mtable-bar"><span style={{ width: `${score}%` }}></span></div>
                        </>}
                      </td>
                      <td><AuthorStatusPill tone={toneForEligibility(match.eligibility)}>{labelForEligibility(match.eligibility)}</AuthorStatusPill></td>
                      <td className="author-mtable-list">
                        {match.reasons?.length ? <ul>{match.reasons.slice(0, 4).map((reason, i) => <li key={i}>{reason}</li>)}</ul> : <span className="author-mtable-meta">—</span>}
                      </td>
                      <td className="author-mtable-list gaps">
                        {match.gaps?.length ? <ul>{match.gaps.slice(0, 4).map((gap, i) => <li key={i}>{gap}</li>)}</ul> : <span className="author-mtable-none">Nothing required</span>}
                      </td>
                      <td className="right">
                        <button className={match.eligibility === 'eligible' ? 'copper-button' : 'author-secondary-button'} type="button" onClick={() => openVenue(match)}>
                          {match.eligibility === 'ineligible' ? 'View details' : 'Review venue'}
                        </button>
                      </td>
                    </tr>
                  })}
              </tbody>
            </table>
          </div>
          <p className="author-mtable-footnote">Match scores compare your current manuscript with each venue's configured rules. They explain fit; you choose the destination. Edit your manuscript (step 1) and the scores update after the next check.</p>
        </section> : !error && <section className="author-panel author-live-state">
          <p className="kicker">No matches yet</p>
          <h2>No active participating venues are configured.</h2>
          <p className="author-muted-copy">An administrator needs to create and activate venue configurations before this manuscript can be matched.</p>
        </section>
      }

      <div className="author-bottom-actions">
        <button className="author-secondary-button" type="button" onClick={() => go('/author/readiness')}>Back to readiness</button>
      </div>
    </div>
  </PublicationShell>
}
