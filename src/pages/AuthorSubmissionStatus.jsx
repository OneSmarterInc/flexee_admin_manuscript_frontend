import React, { useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { venueMatches } from '../data/authorMockData.js'

function currentVenue() {
  const slug = sessionStorage.getItem('authorSelectedVenue')
  return venueMatches.find(item => item.slug === slug) || venueMatches[0]
}

export default function AuthorSubmissionStatus() {
  const venue = currentVenue()
  const [submitted, setSubmitted] = useState(false)

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Submission status</div>
      <AuthorFlowNav active="status" />
      <AuthorPrototypeNotice />

      <div className="author-page-heading author-heading-row">
        <div>
          <p className="kicker">Submission status</p>
          <h1 className="publication-title">{submitted ? `Submitted to ${venue.name}.` : `Your packet is ready for ${venue.name}.`}</h1>
          <p className="publication-lede">
            {submitted
              ? 'This preview now shows the state an author would see after formal submission. A production submission will be created by the backend and recorded in the audit trail.'
              : 'This frontend preview shows the post-selection workspace. The backend will create the real venue submission, forms, files, audit events, and editorial decision history.'}
          </p>
        </div>
        <AuthorStatusPill tone="good">{submitted ? 'Under editorial review' : 'Packet ready'}</AuthorStatusPill>
      </div>

      <div className="author-status-layout">
        <section className="author-panel author-status-card">
          <div className="author-status-header">
            <div>
              <span className="author-venue-type">{venue.type}</span>
              <h2>{venue.name}</h2>
              <p>Selected destination</p>
            </div>
            <AuthorStatusPill tone="good">{submitted ? 'Submitted' : 'Ready to submit'}</AuthorStatusPill>
          </div>

          <div className="author-packet-list">
            <div><span>✓</span><div><b>Manuscript file</b><small>Reuses the original manuscript record.</small></div></div>
            <div><span>✓</span><div><b>Author metadata</b><small>Primary author and co-author information prepared.</small></div></div>
            <div><span>✓</span><div><b>AI-use disclosure</b><small>Carried forward from the author workspace.</small></div></div>
            <div><span>✓</span><div><b>Venue requirements</b><small>Venue-specific requirements included in the packet preview.</small></div></div>
            <div><span>✓</span><div><b>Editorial brief and evidence</b><small>Prepared for the human editorial team.</small></div></div>
          </div>

          <div className="author-submit-callout" aria-live="polite">
            <div>
              <p className="kicker">{submitted ? 'Preview event recorded' : 'Production action'}</p>
              <h3>{submitted ? 'Now with the editorial team' : 'Submit to this venue'}</h3>
              <p>{submitted
                ? 'No real submission was sent from this frontend prototype.'
                : 'The live action will create the formal venue submission only after the backend routing APIs are connected.'}</p>
            </div>
            <button className="copper-button" type="button" onClick={() => setSubmitted(true)} disabled={submitted}>
              {submitted ? 'Submitted in preview' : 'Submit packet'}
            </button>
          </div>
        </section>

        <aside className="author-sidebar">
          <section className="author-panel author-guide-card">
            <p className="kicker">Activity</p>
            <h2>Submission timeline</h2>
            <div className="author-timeline">
              <div className="complete"><span></span><p><b>Manuscript created</b><small>Author details and file captured.</small></p></div>
              <div className="complete"><span></span><p><b>Readiness checked</b><small>Preventable gaps surfaced.</small></p></div>
              <div className="complete"><span></span><p><b>Venue selected</b><small>{venue.name}</small></p></div>
              <div className={submitted ? 'complete' : 'current'}><span></span><p><b>Packet {submitted ? 'submitted' : 'ready'}</b><small>{submitted ? 'Preview submission created.' : 'Waiting for formal submission.'}</small></p></div>
              <div className={submitted ? 'current' : ''}><span></span><p><b>Editorial decision</b><small>{submitted ? 'Waiting for a human editor.' : 'Human editor decision will appear here.'}</small></p></div>
            </div>
          </section>
          <section className="author-panel author-transfer-card">
            <p className="kicker">After a decision</p>
            <h2>Transfer without starting over.</h2>
            <p>If you need another destination later, reuse the manuscript and metadata and prepare a new venue-specific packet.</p>
            <button className="author-secondary-button" type="button" onClick={() => go('/author/transfer')}>Preview transfer</button>
          </section>
        </aside>
      </div>

      <div className="author-bottom-actions">
        <button className="author-secondary-button" type="button" onClick={() => go('/author/venue-assessment/' + venue.slug)}>Back to assessment</button>
        <button className="author-secondary-button" type="button" onClick={() => go('/author')}>Return to workspace</button>
      </div>
    </div>
  </PublicationShell>
}
