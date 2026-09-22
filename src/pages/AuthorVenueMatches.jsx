import React from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { previewManuscript, venueMatches } from '../data/authorMockData.js'

function openVenue(venue) {
  sessionStorage.setItem('authorSelectedVenue', venue.slug)
  go(`/author/venue-assessment/${venue.slug}`)
}

export default function AuthorVenueMatches() {
  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Venue matches</div>
      <AuthorFlowNav active="venues" />
      <AuthorPrototypeNotice />

      <div className="author-page-heading">
        <p className="kicker">Venue matching</p>
        <h1 className="publication-title">Compare fit before you choose.</h1>
        <p className="publication-lede">These preview matches explain alignment and gaps for <b>{previewManuscript.title}</b>. The production list will come from participating venue configurations.</p>
      </div>

      <div className="author-match-list">
        {venueMatches.map((venue, index) => <article className={`author-match-card ${index === 0 ? 'featured' : ''}`} key={venue.slug}>
          <div className="author-match-rank">{String(index + 1).padStart(2, '0')}</div>
          <div className="author-match-main">
            <div className="author-match-heading">
              <div>
                <span className="author-venue-type">{venue.type}</span>
                <h2>{venue.name}</h2>
              </div>
              <AuthorStatusPill tone={venue.tone}>{venue.fit}</AuthorStatusPill>
            </div>
            <p className="author-match-summary">{venue.summary}</p>
            <div className="author-match-columns">
              <div>
                <h3>Why it may fit</h3>
                <ul>{venue.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
              </div>
              <div>
                <h3>Before submission</h3>
                <ul className="gaps">{venue.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul>
              </div>
            </div>
          </div>
          <div className="author-match-action">
            <button className={index === 0 ? 'copper-button' : 'author-secondary-button'} type="button" onClick={() => openVenue(venue)}>
              Review assessment
            </button>
          </div>
        </article>)}
      </div>

      <div className="author-bottom-actions">
        <button className="author-secondary-button" type="button" onClick={() => go('/author/readiness')}>Back to readiness</button>
      </div>
    </div>
  </PublicationShell>
}
