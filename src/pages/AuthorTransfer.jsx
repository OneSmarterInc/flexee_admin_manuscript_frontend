import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import {
  authorApi,
  currentSubmissionPath,
  friendlyAuthorError,
  getAuthorSession,
  saveAuthorSession,
  pollAuthorJob,
} from '../authorApi.js'

export default function AuthorTransfer() {
  const [submission, setSubmission] = useState(null)
  const [venues, setVenues] = useState([])
  const [choice, setChoice] = useState('')
  const [shareReviewHistory, setShareReviewHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const session = getAuthorSession()
      if (!session.submissionId || !session.accessToken) {
        setError('No venue submission is available to transfer.')
        setLoading(false)
        return
      }
      try {
        const [submissionPayload, venuePayload] = await Promise.all([
          authorApi(currentSubmissionPath('/')),
          api('/api/author/venues/'),
        ])
        setSubmission(submissionPayload.submission)
        const alternatives = (venuePayload.venues || []).filter(item => item.id !== submissionPayload.submission.venue?.id)
        setVenues(alternatives)
        setChoice(alternatives[0]?.id || '')
      } catch (err) {
        setError(friendlyAuthorError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function prepareTransfer() {
    const target = venues.find(item => item.id === choice)
    if (!target || !submission || !['rejected', 'withdrawn'].includes(submission.status)) return

    setBusy(true)
    setError('')
    try {
      const payload = await authorApi(currentSubmissionPath('/transfer/'), {
        method: 'POST',
        body: JSON.stringify({
          venue_id: target.id,
          reason: 'Author selected a new destination from the transfer workflow.',
          share_review_history: shareReviewHistory,
        }),
      })
      const next = payload.submission
      saveAuthorSession({
        submissionId: next.id,
        selectedVenueId: target.id,
        selectedVenueSlug: target.slug,
      })

      try {
        const resp = await authorApi(`/api/author/venue-submissions/${next.id}/assessment/run/`, { method: 'POST' })
        if (resp.job_id) await pollAuthorJob(resp.job_id)
        go('/author/status')
      } catch {
        // The transfer itself succeeded. If the AI assessment is temporarily
        // unavailable, preserve the new submission and let the author retry it.
        go(`/author/venue-assessment/${target.slug}`)
      }
    } catch (err) {
      setError(friendlyAuthorError(err))
      setBusy(false)
    }
  }

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / <button className="author-text-link" type="button" onClick={() => go('/author/status')}>Submission status</button> / Transfer</div>
      <AuthorPrototypeNotice />

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Transfer unavailable.</b> {error}</div>}

      <div className="author-page-heading">
        <p className="kicker">Transfer submission</p>
        <h1 className="publication-title">Choose another destination without rebuilding the manuscript.</h1>
        <p className="publication-lede">The manuscript, author metadata, disclosures, and readiness history stay with the manuscript record. A new venue-specific submission and packet are created for the destination you choose.</p>
      </div>

      {loading ? <section className="author-panel author-live-state"><p className="kicker">Transfer</p><h2>Loading available venues…</h2></section> :
        submission && !['rejected', 'withdrawn'].includes(submission.status) ? <section className="author-panel author-live-state">
          <p className="kicker">Transfer not available yet</p>
          <h2>This submission has not reached a transferable state.</h2>
          <p className="author-muted-copy">Transfers are available after a rejection or withdrawal. If you have not submitted yet and want another destination, return to venue matches instead.</p>
          <button className="author-secondary-button" type="button" onClick={() => go('/author/status')}>Back to submission status</button>
        </section> :
        submission && <div className="author-transfer-layout">
          <section className="author-panel author-transfer-main">
            <div className="author-transfer-reuse">
              <p className="kicker">Current destination</p>
              <h2>{submission.venue?.name}</h2>
              <p className="author-muted-copy">Current status: {String(submission.status || '').replaceAll('_', ' ')}</p>
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
              {venues.length ? venues.map(venue => <label className={`author-transfer-option ${choice === venue.id ? 'selected' : ''}`} key={venue.id}>
                <input type="radio" name="transferVenue" value={venue.id} checked={choice === venue.id} onChange={() => setChoice(venue.id)} />
                <div>
                  <span className="author-venue-type">{venue.venue_type}</span>
                  <h3>{venue.name}</h3>
                  <p>{venue.config?.aims_scope || venue.description || 'Venue configuration available for matching.'}</p>
                  <div className="author-transfer-meta">
                    <AuthorStatusPill tone="neutral">Config v{venue.config?.version || '—'}</AuthorStatusPill>
                    <span>{venue.config?.article_types?.length ? venue.config.article_types.join(', ') : 'Article types not configured'}</span>
                  </div>
                </div>
              </label>) : <div className="author-prototype-notice"><b>No alternative venues.</b> There are no other active participating venues configured right now.</div>}
            </div>

            <section className="author-requirements-card" aria-label="Prior review history consent">
              <p className="kicker">Review-history sharing</p>
              <h2>Your choice — off by default.</h2>
              <label className="author-attestation">
                <input
                  type="checkbox"
                  checked={shareReviewHistory}
                  onChange={event => setShareReviewHistory(event.target.checked)}
                  disabled={busy}
                />
                <span>
                  Include prior editorial/review history in the transfer package.
                  <small>
                    If selected, the MECA package may include the prior editorial brief, evidence,
                    editor feedback, and decision. The prior editor identity is not transferred.
                    Leave this unchecked to transfer only the manuscript and transfer metadata.
                  </small>
                </span>
              </label>
            </section>

            <div className="author-form-actions">
              <button className="author-secondary-button" type="button" onClick={() => go('/author/status')}>Cancel</button>
              <button className="copper-button" type="button" onClick={prepareTransfer} disabled={!choice || busy || !['rejected', 'withdrawn'].includes(submission.status)}>{busy ? 'Preparing transfer…' : 'Prepare transfer packet'}</button>
            </div>
          </section>

          <aside className="author-sidebar">
            <section className="author-panel author-guide-card">
              <p className="kicker">What changes</p>
              <h2>Venue-specific only.</h2>
              <div className="author-check-list">
                <div><span aria-hidden="true">1</span><p><b>New venue submission</b><small>The original manuscript is reused; a new destination-specific record is created.</small></p></div>
                <div><span aria-hidden="true">2</span><p><b>New policy assessment</b><small>The selected venue’s active configuration is pinned to the new submission.</small></p></div>
                <div><span aria-hidden="true">3</span><p><b>New evidence packet</b><small>The venue assessment is regenerated against the new outlet’s rules.</small></p></div>
                <div><span aria-hidden="true">4</span><p><b>MECA transfer package</b><small>The manuscript and transfer metadata are packaged for exchange. Prior review history is included only when you explicitly opt in.</small></p></div>
              </div>
            </section>
          </aside>
        </div>}
    </div>
  </PublicationShell>
}
