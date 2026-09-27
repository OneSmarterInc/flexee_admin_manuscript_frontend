import React, { useEffect, useMemo, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorStatusPill } from '../components/AuthorFlow.jsx'
import {
  authorApi,
  currentManuscriptPath,
  currentSubmissionPath,
  friendlyAuthorError,
  getAuthorSession,
} from '../authorApi.js'

function pretty(value) {
  return String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function statusTone(status) {
  if (['accepted', 'packet_ready', 'eligible', 'completed', 'pass'].includes(status)) return 'good'
  if (['rejected', 'revision_requested', 'needs_changes', 'warning', 'fail'].includes(status)) return 'warn'
  return 'neutral'
}

function formatDate(value) {
  if (!value) return '—'
  try { return new Date(value).toLocaleString() } catch { return String(value) }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0)
  if (!value) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function DetailRow({ label, value }) {
  return <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,.07)' }}>
    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '4px' }}>{label}</div>
    <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value || '—'}</div>
  </div>
}

export default function AuthorManuscriptDetails() {
  const [manuscript, setManuscript] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [matches, setMatches] = useState([])
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const session = getAuthorSession()
      if (!session.manuscriptId) {
        setError('No manuscript is selected. Return to the author workspace and choose a manuscript.')
        setLoading(false)
        return
      }

      try {
        const manuscriptPayload = await authorApi(currentManuscriptPath('/'))
        setManuscript(manuscriptPayload.manuscript)

        try {
          const readinessPayload = await authorApi(currentManuscriptPath('/readiness/'))
          setReadiness(readinessPayload)
        } catch (err) {
          if (err.status !== 404) throw err
        }

        try {
          const matchPayload = await authorApi(currentManuscriptPath('/matches/'))
          setMatches(matchPayload.matches || [])
        } catch (err) {
          if (err.status !== 404) throw err
        }

        if (session.submissionId) {
          try {
            const submissionPayload = await authorApi(currentSubmissionPath('/'))
            setSubmission(submissionPayload.submission)
          } catch (err) {
            if (err.status !== 404) throw err
          }
        }
      } catch (err) {
        setError(friendlyAuthorError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const mechanical = readiness?.mechanical_readiness || manuscript?.latest_readiness || null
  const semantic = readiness?.semantic_readiness || null
  const findings = mechanical?.findings || []
  const semanticFindings = semantic?.findings || []
  const wordCount = mechanical?.summary?.word_count || manuscript?.parsed_profile?.word_count || 0
  const brief = submission?.editorial_brief || {}
  const requirements = submission?.requirements || { configured: false, complete: true, items: [] }
  const decision = submission?.decision || null

  const matchForSubmission = useMemo(() => {
    if (!submission?.venue?.id) return null
    return matches.find(item => item.venue?.id === submission.venue.id) || null
  }, [matches, submission])

  if (loading) return <PublicationShell>
    <div className="wrap author-flow-page">
      <section className="author-panel author-live-state"><p className="kicker">Manuscript details</p><h2>Loading manuscript…</h2></section>
    </div>
  </PublicationShell>

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Manuscript details</div>

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Manuscript unavailable.</b> {error}</div>}

      {manuscript && <>
        <div className="author-page-heading author-heading-row">
          <div>
            <p className="kicker">Uploaded manuscript</p>
            <span className="author-venue-type">{pretty(manuscript.manuscript_type)}</span>
            <h1 className="publication-title">{manuscript.title}</h1>
            <p className="publication-lede">{manuscript.manuscript_filename}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {submission?.status && <AuthorStatusPill tone={statusTone(submission.status)}>{pretty(submission.status)}</AuthorStatusPill>}
            <button className="author-secondary-button" type="button" onClick={() => go('/author')}>Back to workspace</button>
          </div>
        </div>

        <div className="author-report-grid">
          <section className="author-panel author-report-panel">
            <div className="author-panel-heading"><div><p className="kicker">Manuscript</p><h2>Uploaded file and author details</h2></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 28px' }}>
              <DetailRow label="Title" value={manuscript.title} />
              <DetailRow label="Filename" value={manuscript.manuscript_filename} />
              <DetailRow label="Manuscript type" value={pretty(manuscript.manuscript_type)} />
              <DetailRow label="File size" value={formatBytes(manuscript.manuscript_bytes)} />
              <DetailRow label="Author" value={manuscript.author_name} />
              <DetailRow label="Author email" value={manuscript.author_email} />
              <DetailRow label="Co-authors" value={manuscript.coauthors || 'None recorded'} />
              <DetailRow label="Uploaded" value={formatDate(manuscript.created_at)} />
              <DetailRow label="Last updated" value={formatDate(manuscript.updated_at)} />
              <DetailRow label="Word count" value={wordCount ? Number(wordCount).toLocaleString() : 'Not available'} />
            </div>
            {manuscript.abstract && <div style={{ marginTop: '22px' }}><h3>Abstract</h3><p style={{ whiteSpace: 'pre-wrap' }}>{manuscript.abstract}</p></div>}
            {Array.isArray(manuscript.keywords) && manuscript.keywords.length > 0 && <div style={{ marginTop: '18px' }}><h3>Keywords</h3><p>{manuscript.keywords.join(', ')}</p></div>}
            {manuscript.disclosure && <div style={{ marginTop: '18px' }}><h3>AI-use disclosure</h3><p style={{ whiteSpace: 'pre-wrap' }}>{manuscript.disclosure}</p></div>}
            {manuscript.notes && <div style={{ marginTop: '18px' }}><h3>Author notes</h3><p style={{ whiteSpace: 'pre-wrap' }}>{manuscript.notes}</p></div>}
          </section>

          <aside className="author-sidebar">
            <section className="author-panel author-guide-card">
              <p className="kicker">Workflow</p>
              <h2>Current state</h2>
              <DetailRow label="Readiness" value={mechanical?.status ? pretty(mechanical.status) : 'Not run'} />
              <DetailRow label="Venue matches" value={matches.length ? `${matches.length} available` : 'None recorded'} />
              <DetailRow label="Selected venue" value={submission?.venue?.name || 'Not selected'} />
              <DetailRow label="Submission status" value={submission?.status ? pretty(submission.status) : 'No venue submission yet'} />
              <DetailRow label="Retention" value={submission?.retention_purged_at ? `Purged ${formatDate(submission.retention_purged_at)}` : submission?.retention_expires_at ? `Expires ${formatDate(submission.retention_expires_at)}` : 'No expiry recorded'} />
            </section>
          </aside>
        </div>

        <section className="author-panel" style={{ marginTop: '24px' }}>
          <div className="author-panel-heading">
            <div><p className="kicker">Readiness</p><h2>Checks and findings</h2></div>
            {mechanical?.status && <AuthorStatusPill tone={statusTone(mechanical.status)}>{pretty(mechanical.status)}</AuthorStatusPill>}
          </div>

          {mechanical?.summary && <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <span className="author-human-pill">{Number(mechanical.summary.blocking_issues || 0)} blocking</span>
            <span className="author-human-pill">{Number(mechanical.summary.warnings || 0)} warnings</span>
            <span className="author-human-pill">{mechanical.summary.ready_for_matching ? 'Ready for matching' : 'Needs attention'}</span>
          </div>}

          {findings.length ? <div className="author-assessment-list">
            {findings.map((finding, index) => <article key={finding.code || index}>
              <div><span>{finding.label || pretty(finding.code)}</span><AuthorStatusPill tone={statusTone(finding.status)}>{pretty(finding.status)}</AuthorStatusPill></div>
              <p>{finding.detail}</p>
              {finding.source?.locator && <small>Source: {finding.source.locator}</small>}
            </article>)}
          </div> : <p className="author-muted-copy">No deterministic readiness findings are stored yet.</p>}

          {semantic && <div style={{ marginTop: '26px' }}>
            <h3>Semantic readiness</h3>
            {semantic.summary?.model && <p className="author-muted-copy">Model: {semantic.summary.model}</p>}
            {semanticFindings.length ? <div className="author-assessment-list">
              {semanticFindings.map((finding, index) => <article key={finding.code || index}>
                <div><span>{finding.label || finding.finding_type || `Finding ${index + 1}`}</span></div>
                <p>{finding.detail || finding.summary || finding.claim || JSON.stringify(finding)}</p>
              </article>)}
            </div> : semantic.summary ? <p style={{ whiteSpace: 'pre-wrap' }}>{semantic.summary.note || semantic.summary.summary || 'Semantic readiness data is stored.'}</p> : null}
          </div>}
        </section>

        <section className="author-panel" style={{ marginTop: '24px' }}>
          <div className="author-panel-heading"><div><p className="kicker">Venue matching</p><h2>Recorded venue matches</h2></div></div>
          {matches.length ? <div className="author-match-list">
            {matches.map(match => <article className="author-match-card" key={match.id}>
              <div className="author-match-main">
                <div className="author-match-heading">
                  <div><span className="author-venue-type">{pretty(match.venue?.venue_type)}</span><h2>{match.venue?.name}</h2></div>
                  <AuthorStatusPill tone={statusTone(match.eligibility)}>{pretty(match.eligibility)}</AuthorStatusPill>
                </div>
                <p>{match.fit_summary || 'No fit summary recorded.'}</p>
                {match.reasons?.length > 0 && <div><h3>Why it may fit</h3><ul>{match.reasons.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
                {match.gaps?.length > 0 && <div><h3>Gaps</h3><ul className="gaps">{match.gaps.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
              </div>
            </article>)}
          </div> : <p className="author-muted-copy">No venue matches have been recorded for this manuscript yet.</p>}
        </section>

        <section className="author-panel" style={{ marginTop: '24px' }}>
          <div className="author-panel-heading">
            <div><p className="kicker">Latest venue submission</p><h2>{submission?.venue?.name || 'No venue selected yet'}</h2></div>
            {submission?.status && <AuthorStatusPill tone={statusTone(submission.status)}>{pretty(submission.status)}</AuthorStatusPill>}
          </div>

          {!submission ? <p className="author-muted-copy">This manuscript has not yet been attached to a venue submission.</p> : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 28px' }}>
              <DetailRow label="Venue" value={submission.venue?.name} />
              <DetailRow label="Venue configuration" value={submission.venue_config_version ? `Version ${submission.venue_config_version}` : '—'} />
              <DetailRow label="Created" value={formatDate(submission.created_at)} />
              <DetailRow label="Submitted" value={formatDate(submission.submitted_at)} />
              <DetailRow label="Requirements" value={requirements.configured ? (requirements.complete ? 'Complete' : 'Action required') : 'None configured'} />
              <DetailRow label="Evidence items" value={String(submission.evidence?.length || 0)} />
            </div>

            {matchForSubmission?.fit_summary && <div style={{ marginTop: '20px' }}><h3>Venue fit</h3><p>{matchForSubmission.fit_summary}</p></div>}

            {brief.editor_summary && <div style={{ marginTop: '20px' }}><h3>Editorial brief</h3><p style={{ whiteSpace: 'pre-wrap' }}>{brief.editor_summary}</p></div>}

            {submission.evidence?.length > 0 && <div style={{ marginTop: '20px' }}>
              <h3>Evidence trail</h3>
              <div className="author-evidence-list">
                {submission.evidence.map((item, index) => <article key={item.id || index}>
                  <h3>{item.finding_type || `Evidence ${index + 1}`}</h3>
                  <span>{item.source_locator || item.source_type}</span>
                  <p>{item.claim || item.excerpt || 'Evidence attached.'}</p>
                </article>)}
              </div>
            </div>}

            {requirements.configured && <div style={{ marginTop: '20px' }}>
              <h3>Venue requirements</h3>
              <div className="author-packet-list">
                {(requirements.items || []).map(item => <div key={item.key}>
                  <span>{item.completed ? '✓' : '!'}</span>
                  <div><b>{item.label}</b><small>{item.completed ? (item.file?.name ? `Uploaded: ${item.file.name}` : 'Complete') : item.required ? 'Required' : 'Optional'}</small></div>
                </div>)}
              </div>
            </div>}

            {decision && Object.keys(decision).length > 0 && <div style={{ marginTop: '22px', padding: '18px', border: '1px solid rgba(0,0,0,.1)', borderRadius: '12px' }}>
              <p className="kicker">Human editorial decision</p>
              <h3>{pretty(decision.decision || submission.status)}</h3>
              {decision.note && <p style={{ whiteSpace: 'pre-wrap' }}>{decision.note}</p>}
              <p className="author-muted-copy">{decision.decided_by ? `Decision by ${decision.decided_by}` : ''}{decision.decided_at ? ` · ${formatDate(decision.decided_at)}` : ''}</p>
            </div>}
          </>}
        </section>

        <div className="author-bottom-actions">
          <button className="author-secondary-button" type="button" onClick={() => go('/author')}>Back to workspace</button>
          <button className="author-secondary-button" type="button" onClick={() => go('/author/readiness')}>Open readiness</button>
          <button className="author-secondary-button" type="button" onClick={() => go('/author/venues')}>Open venue matches</button>
          {submission?.id && <button className="copper-button" type="button" onClick={() => go('/author/status')}>Open submission status</button>}
        </div>
      </>}
    </div>
  </PublicationShell>
}
