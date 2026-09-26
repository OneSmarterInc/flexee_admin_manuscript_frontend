import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { authorApi, currentSubmissionPath, friendlyAuthorError, getAuthorSession } from '../authorApi.js'

function statusLabel(status) {
  const labels = {
    draft: 'Draft',
    packet_ready: 'Packet ready',
    submitted: 'Submitted',
    under_review: 'Under editorial review',
    revision_requested: 'Revision requested',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    transferred: 'Transferred',
  }
  return labels[status] || String(status || 'Unknown').replaceAll('_', ' ')
}

function statusTone(status) {
  if (['packet_ready', 'accepted'].includes(status)) return 'good'
  if (['revision_requested', 'rejected'].includes(status)) return 'warn'
  return 'neutral'
}

function DecisionBanner({ decision, status }) {
  if (!decision || !Object.keys(decision).length) return null

  const decisionValue = decision.decision || status
  const isAccepted = decisionValue === 'accepted'
  const isRejected = decisionValue === 'rejected'

  const borderColor = isAccepted ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b'
  const bgColor = isAccepted
    ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)'
    : isRejected
    ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)'
    : 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)'
  const borderStyle = `1px solid ${isAccepted ? 'rgba(16,185,129,0.2)' : isRejected ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`

  const icon = isAccepted ? '✓' : isRejected ? '✕' : '↩'
  const headline = isAccepted
    ? 'Congratulations — your manuscript has been accepted!'
    : isRejected
    ? 'Your submission was not accepted at this time.'
    : 'The editor has requested revisions to your manuscript.'

  return (
    <div style={{ borderRadius: '12px', padding: '24px 28px', marginBottom: '24px', borderLeft: `4px solid ${borderColor}`, background: bgColor, border: borderStyle }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: borderColor, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 'bold', flexShrink: 0,
        }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#1c1917' }}>{headline}</h3>
          {decision.note && (
            <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', fontSize: '15px', lineHeight: 1.6, color: '#374151' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>Editor note</p>
              <p style={{ margin: 0 }}>{decision.note}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            {decision.decided_at && (
              <span>🕐 {new Date(decision.decided_at).toLocaleString()}</span>
            )}
            {decision.decided_by && (
              <span>👤 Decision by {decision.decided_by}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthorSubmissionStatus() {
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const session = getAuthorSession()
    if (!session.submissionId || !session.accessToken) {
      setError('No venue submission is active in this browser session. Choose a venue first.')
      setLoading(false)
      return
    }
    try {
      const payload = await authorApi(currentSubmissionPath('/'))
      setSubmission(payload.submission)
    } catch (err) {
      setError(friendlyAuthorError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submitPacket() {
    if (!submission?.id) return
    setBusy(true)
    setError('')
    try {
      const payload = await authorApi(currentSubmissionPath('/submit/'), { method: 'POST' })
      setSubmission(payload.submission)
    } catch (err) {
      setError(friendlyAuthorError(err))
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = submission?.status === 'packet_ready'
  const canTransfer = ['rejected', 'withdrawn'].includes(submission?.status)
  const submitted = ['submitted', 'under_review', 'revision_requested', 'accepted', 'rejected'].includes(submission?.status)
  const hasDecision = submission?.decision && Object.keys(submission.decision).length > 0
  const venue = submission?.venue
  const packet = submission?.packet || {}
  const brief = submission?.editorial_brief || {}

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Submission status</div>
      <AuthorFlowNav active="status" />
      <AuthorPrototypeNotice />

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Submission unavailable.</b> {error}</div>}

      {loading ? <section className="author-panel author-live-state"><p className="kicker">Submission</p><h2>Loading your venue submission…</h2></section> :
        submission && <>
          <div className="author-page-heading author-heading-row">
            <div>
              <p className="kicker">Submission status</p>
              <h1 className="publication-title">{submitted ? `Submitted to ${venue?.name}.` : `Your packet for ${venue?.name}.`}</h1>
              <p className="publication-lede">{brief.editor_summary || 'The manuscript, venue configuration, assessment, and evidence stay attached to this venue-specific submission.'}</p>
            </div>
            <AuthorStatusPill tone={statusTone(submission.status)}>{statusLabel(submission.status)}</AuthorStatusPill>
          </div>

          {/* Editorial Decision Banner – shown prominently when a human decision exists */}
          {hasDecision && <DecisionBanner decision={submission.decision} status={submission.status} />}

          <div className="author-status-layout">
            <section className="author-panel author-status-card">
              <div className="author-status-header">
                <div>
                  <span className="author-venue-type">{venue?.venue_type}</span>
                  <h2>{venue?.name}</h2>
                  <p>Venue configuration v{submission.venue_config_version || '—'}</p>
                </div>
                <AuthorStatusPill tone={statusTone(submission.status)}>{statusLabel(submission.status)}</AuthorStatusPill>
              </div>

              <div className="author-packet-list">
                <div><span>✓</span><div><b>Manuscript file</b><small>{packet.manuscript_filename || 'Original manuscript retained.'}</small></div></div>
                <div><span>✓</span><div><b>Author metadata</b><small>{packet.author_name || 'Author information retained.'}{packet.coauthors ? ` · ${packet.coauthors}` : ''}</small></div></div>
                <div><span>✓</span><div><b>AI-use disclosure</b><small>{packet.disclosure || 'Disclosure retained with the manuscript.'}</small></div></div>
                <div><span>{packet.editorial_brief_ready ? '✓' : '!'}</span><div><b>Editorial brief</b><small>{packet.editorial_brief_ready ? 'Venue-specific editorial brief prepared.' : 'Return to the assessment step to prepare the brief.'}</small></div></div>
                <div><span>{packet.evidence_count ? '✓' : '!'}</span><div><b>Evidence trail</b><small>{packet.evidence_count ? `${packet.evidence_count} evidence item${packet.evidence_count === 1 ? '' : 's'} attached.` : 'No evidence items are attached yet.'}</small></div></div>
              </div>

              <div className="author-submit-callout" aria-live="polite">
                <div>
                  <p className="kicker">{submitted ? 'Editorial workflow' : 'Author action'}</p>
                  {!submitted ? (
                    <>
                      <h3>{canSubmit ? 'Submit to this venue' : 'Finish the venue assessment first'}</h3>
                      <p>{canSubmit ? 'This records the formal venue submission using the prepared packet.' : 'A packet must be ready before the live submission action is enabled.'}</p>
                    </>
                  ) : hasDecision ? (
                    <>
                      <h3>Editorial decision recorded.</h3>
                      <p>See the highlighted decision above for the editor's full note and reasoning.{canTransfer ? ' You may now transfer this manuscript to another venue.' : ''}</p>
                    </>
                  ) : (
                    <>
                      <h3>Your packet is submitted — awaiting editorial review.</h3>
                      <p>The submission is now in the Editor Workspace queue. When the editor records a decision (accepted, rejected, or revision requested), it will appear here automatically.</p>
                    </>
                  )}
                </div>
                {!submitted && <button className="copper-button" type="button" onClick={submitPacket} disabled={!canSubmit || busy}>
                  {busy ? 'Submitting…' : 'Submit packet'}
                </button>}
              </div>
            </section>

            <aside className="author-sidebar">
              <section className="author-panel author-guide-card">
                <p className="kicker">Activity</p>
                <h2>Submission timeline</h2>
                <div className="author-timeline">
                  <div className="complete"><span></span><p><b>Manuscript created</b><small>Secure author manuscript record created.</small></p></div>
                  <div className="complete"><span></span><p><b>Readiness checked</b><small>Deterministic and available semantic checks completed.</small></p></div>
                  <div className="complete"><span></span><p><b>Venue selected</b><small>{venue?.name}</small></p></div>
                  <div className={submission.status === 'draft' ? 'current' : 'complete'}><span></span><p><b>Packet {submission.status === 'draft' ? 'preparing' : 'ready'}</b><small>{submission.status === 'draft' ? 'Venue assessment still needed.' : 'Venue-specific materials prepared.'}</small></p></div>
                  <div className={submitted ? 'complete' : submission.status === 'packet_ready' ? 'current' : ''}><span></span><p><b>Submitted</b><small>{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Waiting for author submission.'}</small></p></div>
                  <div className={hasDecision ? 'complete' : submitted ? 'current' : ''}><span></span><p><b>Editorial decision</b><small>{hasDecision ? `${statusLabel(submission.decision.decision || submission.status)} · ${submission.decision.decided_at ? new Date(submission.decision.decided_at).toLocaleString() : ''}` : 'Human editorial decision pending.'}</small></p></div>
                </div>
              </section>
              <section className="author-panel author-transfer-card">
                <p className="kicker">Transfer</p>
                <h2>Reuse the manuscript for another venue.</h2>
                <p>{canTransfer
                  ? 'Reuse this manuscript for another venue without rebuilding the author metadata or readiness history.'
                  : 'Transfer becomes available after a rejection or withdrawal. Before submission, return to venue matches if you want a different destination.'}</p>
                <button className="author-secondary-button" type="button" onClick={() => go('/author/transfer')} disabled={!canTransfer}>Transfer to another venue</button>
              </section>
            </aside>
          </div>

          <div className="author-bottom-actions">
            <button className="author-secondary-button" type="button" onClick={() => go('/author/venue-assessment/' + venue?.slug)}>Back to assessment</button>
            <button className="author-secondary-button" type="button" onClick={() => go('/author')}>Return to workspace</button>
          </div>
        </>}
    </div>
  </PublicationShell>
}
