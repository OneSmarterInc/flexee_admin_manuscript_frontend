import React from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { selectedVenue, venueMatches } from '../data/authorMockData.js'

function getVenue() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  const slug = parts[parts.length - 1]
  const venue = venueMatches.find(item => item.slug === slug) || venueMatches.find(item => item.slug === sessionStorage.getItem('authorSelectedVenue')) || selectedVenue
  if (venue.slug === selectedVenue.slug) return selectedVenue
  return {
    ...venue,
    scope: venue.summary,
    articleType: 'Configured by this venue',
    currentDemand: 'Current priorities will be supplied by the venue agent configuration.',
    assessment: [
      ['Outlet fit', venue.fit, venue.summary],
      ['Policy compliance', 'Review required', venue.gaps.join('; ')],
      ['Contribution', 'To be assessed', 'The connected venue agent will evaluate contribution against this outlet’s editorial identity.'],
      ['Methods', 'To be assessed', 'Method expectations will be checked against the outlet’s accepted methods and reporting rules.'],
      ['Citation integrity', 'To be verified', 'The evidence service will attach source-level verification where applicable.'],
      ['Reviewer expertise', 'Suggested after analysis', 'Reviewer expertise will be proposed from the manuscript and venue criteria.'],
    ],
    evidence: [
      ['Fit evidence', 'Manuscript + venue configuration', venue.reasons.join('; ')],
      ['Submission gaps', 'Venue operating rules', venue.gaps.join('; ')],
    ],
  }
}

export default function AuthorVenueAssessment() {
  const venue = getVenue()

  function chooseVenue() {
    sessionStorage.setItem('authorSelectedVenue', venue.slug)
    go('/author/status')
  }

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / <button className="author-text-link" type="button" onClick={() => go('/author/venues')}>Venue matches</button> / Assessment</div>
      <AuthorFlowNav active="assessment" />
      <AuthorPrototypeNotice />

      <div className="author-page-heading author-heading-row">
        <div>
          <p className="kicker">Venue assessment</p>
          <span className="author-venue-type">{venue.type}</span>
          <h1 className="publication-title">{venue.name}</h1>
          <p className="publication-lede">{venue.summary}</p>
        </div>
        <div className="author-assessment-choice">
          <AuthorStatusPill tone={venue.tone}>{venue.fit}</AuthorStatusPill>
          <button className="copper-button" type="button" onClick={chooseVenue}>Choose this venue</button>
          <small>You remain in control of the destination.</small>
        </div>
      </div>

      <section className="author-venue-context">
        <div><span>Scope</span><p>{venue.scope}</p></div>
        <div><span>Article type</span><p>{venue.articleType}</p></div>
        <div><span>Current demand</span><p>{venue.currentDemand}</p></div>
      </section>

      <div className="author-report-grid">
        <section className="author-panel author-report-panel">
          <div className="author-panel-heading">
            <div><p className="kicker">Editorial brief</p><h2>Venue-specific assessment</h2></div>
          </div>
          <div className="author-assessment-list">
            {venue.assessment.map(([label, status, detail]) => <article key={label}>
              <div><span>{label}</span><b>{status}</b></div>
              <p>{detail}</p>
            </article>)}
          </div>
        </section>

        <aside className="author-sidebar">
          <section className="author-panel author-evidence-card">
            <p className="kicker">Evidence trail</p>
            <h2>Why the system says this</h2>
            <div className="author-evidence-list">
              {venue.evidence.map(([finding, source, detail]) => <article key={finding}>
                <h3>{finding}</h3>
                <span>{source}</span>
                <p>{detail}</p>
              </article>)}
            </div>
          </section>
          <section className="author-panel author-human-card">
            <span className="author-human-pill">Author choice</span>
            <h2>No automatic routing.</h2>
            <p>The assessment can explain fit and prepare the packet, but the author selects the destination.</p>
          </section>
        </aside>
      </div>

      <div className="author-bottom-actions">
        <button className="author-secondary-button" type="button" onClick={() => go('/author/venues')}>Compare other venues</button>
        <button className="copper-button" type="button" onClick={chooseVenue}>Choose {venue.name}</button>
      </div>
    </div>
  </PublicationShell>
}
