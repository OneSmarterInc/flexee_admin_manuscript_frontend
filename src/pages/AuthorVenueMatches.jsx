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

// Template text a small model sometimes copies instead of a real finding.
const PLACEHOLDER_PATTERNS = [
  /^(why )?the manuscript aligns( with the venue)?\.?$/i,
  /^specific missing or conflicting requirement\.?$/i,
  /^(text|reason|gap|plain-language explanation)\.?$/i,
]

function cleanItems(items) {
  const seen = new Set()
  return (items || [])
    .map(item => String(item || '').trim())
    .filter(item => item.length > 3 && !PLACEHOLDER_PATTERNS.some(pattern => pattern.test(item)))
    .map(item => item.charAt(0).toUpperCase() + item.slice(1))
    .filter(item => {
      const key = item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const VISIBLE_ITEMS = 2

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
  const [expanded, setExpanded] = useState({})

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

  const counts = {
    all: matches.length,
    eligible: matches.filter(m => m.eligibility === 'eligible').length,
    needs_changes: matches.filter(m => m.eligibility === 'needs_changes').length,
    ineligible: matches.filter(m => m.eligibility === 'ineligible').length,
  }
  const rows = matches
    .filter(match => filter === 'all' || match.eligibility === filter)
    .slice()
    .sort((a, b) => sort === 'name'
      ? a.venue.name.localeCompare(b.venue.name)
      : (b.match_score?.score ?? -1) - (a.match_score?.score ?? -1))

  function itemList(match, kind) {
    const items = cleanItems(kind === 'fit' ? match.reasons : match.gaps)
    if (!items.length) {
      return kind === 'gap'
        ? <span className="author-mt-none ok">Nothing required</span>
        : <span className="author-mt-none">—</span>
    }
    const key = `${match.id}-${kind}`
    const open = Boolean(expanded[key])
    const shown = open ? items : items.slice(0, VISIBLE_ITEMS)
    return <>
      <ul className={`author-mt-items ${kind}`}>{shown.map((item, index) => <li key={index}>{item}</li>)}</ul>
      {items.length > VISIBLE_ITEMS && <button type="button" className="author-mt-more"
        onClick={() => setExpanded(state => ({ ...state, [key]: !open }))}>
        {open ? 'Show less' : `+${items.length - VISIBLE_ITEMS} more`}
      </button>}
    </>
  }

  return <PublicationShell>
    <div className="wrap author-flow-page author-matches-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Venue matches</div>
      <AuthorFlowNav active="venues" />
      <AuthorPrototypeNotice />

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Venue matching unavailable.</b> {error}</div>}

      <section className="author-mt-head">
        <div className="author-mt-head-copy">
          <p className="kicker">Venue matching</p>
          <h1>Compare fit before you choose.</h1>
          <p>Each venue is checked independently. The match score explains fit and what to change; you choose the destination.</p>
        </div>
        <div className="author-mt-chips" aria-label="Venue matching summary">
          <div className="author-mt-chip"><b>{counts.all}</b><span>Venues</span></div>
          <div className="author-mt-chip ok"><b>{counts.eligible}</b><span>Eligible</span></div>
          <div className="author-mt-chip warn"><b>{counts.needs_changes}</b><span>Needs changes</span></div>
          <div className="author-mt-chip no"><b>{counts.ineligible}</b><span>Not eligible</span></div>
        </div>
      </section>

      {agentBusy && <div className="author-mt-note" role="status"><b>Semantic matching is running.</b> The agent is evaluating each configured venue independently.</div>}
      {agentWarning && <div className="author-mt-note" role="note"><b>Note:</b> {agentWarning} {!agentBusy && manuscript?.parsed_profile?.semantic && <button className="author-text-link author-inline-action" type="button" onClick={runSemanticMatching}>Retry semantic matching</button>}</div>}

      {loading ? <section className="author-panel author-live-state"><p className="kicker">Venue matching</p><h2>Loading participating venues…</h2></section> :
        matches.length ? <section>
          <div className="author-mt-bar">
            <h2>Venue comparison</h2>
            <div className="author-mt-tabs" role="tablist" aria-label="Filter venues">
              {[['all', 'All'], ['eligible', 'Eligible'], ['needs_changes', 'Needs changes'], ['ineligible', 'Not eligible']]
                .map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={filter === key}
                  className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label} · {counts[key]}</button>)}
            </div>
            <span className="author-mt-spacer"></span>
            <span className="author-mt-count">{rows.length} venue{rows.length === 1 ? '' : 's'}</span>
            <select className="author-mt-sort" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort venues">
              <option value="score">Sort: highest match</option>
              <option value="name">Sort: venue name</option>
            </select>
          </div>

          <div className="author-mt-card">
            <div className="author-mt-scroll">
              <table className="author-mt-table">
                <colgroup>
                  <col className="c-venue" /><col className="c-match" /><col className="c-status" />
                  <col className="c-fit" /><col className="c-gap" /><col className="c-act" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th><span className="author-mt-help" tabIndex={0} title={SCORE_HELP} aria-label={SCORE_HELP}>Match ⓘ</span></th>
                    <th>Status</th>
                    <th>Why it may fit</th>
                    <th>Before submission</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(match => {
                    const score = match.match_score?.score ?? null
                    const tone = score === null ? 'low' : scoreTone(score)
                    const meta = `${match.venue.venue_type}${match.venue.organization?.name ? ` · ${match.venue.organization.name}` : ''}`
                    return <tr key={match.id}>
                      <td>
                        <div className="author-mt-name" title={match.venue.name}>{match.venue.name}</div>
                        <div className="author-mt-meta" title={meta}>{meta}</div>
                      </td>
                      <td className={`author-mt-score ${tone}`}
                        title={match.match_score ? `Scope ${match.match_score.breakdown.scope}/40 · Type ${match.match_score.breakdown.type}/25 · Requirements ${match.match_score.breakdown.requirements}/20 · Methods ${match.match_score.breakdown.methods}/15` : ''}>
                        {score === null ? <span className="author-mt-meta">Not scored</span> : <>
                          <div className="author-mt-score-line"><strong>{score}%</strong><em>{match.match_score.label}</em></div>
                          <div className="author-mt-bar-track"><span style={{ width: `${score}%` }}></span></div>
                        </>}
                      </td>
                      <td><AuthorStatusPill tone={toneForEligibility(match.eligibility)}>{labelForEligibility(match.eligibility)}</AuthorStatusPill></td>
                      <td>{itemList(match, 'fit')}</td>
                      <td>{itemList(match, 'gap')}</td>
                      <td className="right">
                        <button className={match.eligibility === 'eligible' ? 'copper-button author-mt-btn' : 'author-secondary-button author-mt-btn'} type="button" onClick={() => openVenue(match)}>
                          {match.eligibility === 'ineligible' ? 'View details' : 'Review venue'}
                        </button>
                      </td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
            <div className="author-mt-foot">Match scores compare your current manuscript with each venue's configured rules (scope 40 · article type 25 · requirements 20 · methods 15). They explain fit; you choose the destination.</div>
          </div>
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
