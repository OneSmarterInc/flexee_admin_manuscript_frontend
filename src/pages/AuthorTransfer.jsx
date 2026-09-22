import React, { useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { venueMatches } from '../data/authorMockData.js'

export default function AuthorTransfer() {
  const currentSlug = sessionStorage.getItem('authorSelectedVenue') || venueMatches[0].slug
  const alternatives = venueMatches.filter(item => item.slug !== currentSlug)
  const [choice, setChoice] = useState(alternatives[0]?.slug || '')

  function prepareTransfer() {
    if (!choice) return
    sessionStorage.setItem('authorSelectedVenue', choice)
    go('/author/status')
  }

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / <button className="author-text-link" type="button" onClick={() => go('/author/status')}>Submission status</button> / Transfer</div>
      <AuthorPrototypeNotice />

      <div className="author-page-heading">
        <p className="kicker">Transfer submission</p>
        <h1 className="publication-title">Choose another destination without rebuilding the submission.</h1>
        <p className="publication-lede">The manuscript, author metadata, and reusable disclosures stay with the manuscript record. Only venue-specific requirements need to be prepared again.</p>
      </div>

      <div className="author-transfer-layout">
        <section className="author-panel author-transfer-main">
          <div className="author-transfer-reuse">
            <p className="kicker">Carried forward</p>
            <h2>What you keep</h2>
            <div className="author-reuse-grid">
              <div><span>✓</span><b>Original manuscript</b></div>
              <div><span>✓</span><b>Author details</b></div>
              <div><span>✓</span><b>AI-use disclosure</b></div>
              <div><span>✓</span><b>Readiness history</b></div>
            </div>
          </div>

          <div className="author-transfer-options">
            <p className="kicker">Alternative venues</p>
            <h2>Select the next outlet</h2>
            {alternatives.map(venue => <label className={`author-transfer-option ${choice === venue.slug ? 'selected' : ''}`} key={venue.slug}>
              <input type="radio" name="transferVenue" value={venue.slug} checked={choice === venue.slug} onChange={() => setChoice(venue.slug)} />
              <div>
                <span className="author-venue-type">{venue.type}</span>
                <h3>{venue.name}</h3>
                <p>{venue.summary}</p>
                <div className="author-transfer-meta">
                  <AuthorStatusPill tone={venue.tone}>{venue.fit}</AuthorStatusPill>
                  <span>{venue.gaps.length} venue-specific update{venue.gaps.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            </label>)}
          </div>

          <div className="author-form-actions">
            <button className="author-secondary-button" type="button" onClick={() => go('/author/status')}>Cancel</button>
            <button className="copper-button" type="button" onClick={prepareTransfer} disabled={!choice}>Prepare transfer packet</button>
          </div>
        </section>

        <aside className="author-sidebar">
          <section className="author-panel author-guide-card">
            <p className="kicker">What changes</p>
            <h2>Venue-specific only.</h2>
            <div className="author-check-list">
              <div><span aria-hidden="true">1</span><p><b>Re-check fit</b><small>Apply the new venue’s scope and current priorities.</small></p></div>
              <div><span aria-hidden="true">2</span><p><b>Re-check policy</b><small>Identify disclosures, forms, or reporting requirements unique to the new venue.</small></p></div>
              <div><span aria-hidden="true">3</span><p><b>Prepare new packet</b><small>Reuse the manuscript while generating the new venue-specific materials.</small></p></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </PublicationShell>
}
