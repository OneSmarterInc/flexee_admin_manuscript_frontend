import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorPageError, AuthorStatusPill } from '../components/AuthorFlow.jsx'
// Loaded only when View is clicked (keeps PDF/Word/ZIP libraries out of the main bundle).
const ManuscriptViewer = lazy(() => import('../components/admin/ManuscriptViewer.jsx'))
import { apiBlob } from '../api.js'
import {
  authorApi,
  currentManuscriptPath,
  currentSubmissionPath,
  friendlyAuthorError,
  getAuthorSession,
} from '../authorApi.js'
import VenueTrustBadge from '../components/VenueTrust.jsx'

function pretty(value) {
  return String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function statusTone(status) {
  if (['accepted', 'packet_ready', 'eligible', 'completed', 'pass'].includes(status)) return 'good'
  if (['rejected', 'revision_requested', 'needs_changes', 'warning', 'fail'].includes(status)) return 'warn'
  return 'neutral'
}

function formatBytes(bytes) {
  const value = Number(bytes || 0)
  if (!value) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function shortDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return String(value) }
}

function resultClass(status) {
  if (['pass', 'completed', 'ok'].includes(status)) return 'pass'
  if (['fail', 'blocking', 'error'].includes(status)) return 'fail'
  if (['warning', 'warn', 'review'].includes(status)) return 'warn'
  return 'info'
}

function resultLabel(status) {
  const cls = resultClass(status)
  if (cls === 'pass') return '✓ Pass'
  if (cls === 'fail') return '✕ Blocking'
  if (cls === 'warn') return '! Review'
  return status ? `● ${pretty(status)}` : '● Note'
}

function scoreTone(score) {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'good'
  if (score >= 35) return 'partial'
  return 'low'
}

// Identical evidence lines (e.g. five "Crossref check: not found") are shown once with a count.
function groupEvidence(items = []) {
  const groups = new Map()
  items.forEach(item => {
    const title = item.finding_type || item.source_type || 'Evidence'
    const detail = item.claim || item.excerpt || 'Evidence attached.'
    const key = `${title}|${detail}`
    const entry = groups.get(key) || { title, source: item.source_locator || item.source_type || '', detail, count: 0 }
    entry.count += 1
    groups.set(key, entry)
  })
  return [...groups.values()]
}

async function loadAuthorFile(manuscriptId) {
  const session = getAuthorSession()
  const headers = session.accessToken ? { 'X-Manuscript-Token': session.accessToken } : {}
  return apiBlob(`/api/author/manuscripts/${manuscriptId}/file/`, { headers })
}

export default function AuthorManuscriptDetails() {
  const [manuscript, setManuscript] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [matches, setMatches] = useState([])
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checksView, setChecksView] = useState('checks')
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [fileError, setFileError] = useState('')

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

  async function downloadFile() {
    if (!manuscript) return
    setDownloading(true)
    setFileError('')
    try {
      const { blob } = await loadAuthorFile(manuscript.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = manuscript.manuscript_filename || 'manuscript'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setFileError(err.message || 'The file could not be downloaded.')
    } finally {
      setDownloading(false)
    }
  }

  const sortedMatches = matches.slice().sort((a, b) => (b.match_score?.score ?? -1) - (a.match_score?.score ?? -1))
  const visibleMatches = showAllMatches ? sortedMatches : sortedMatches.slice(0, 5)
  const evidenceGroups = groupEvidence(submission?.evidence || [])
  const hasFile = manuscript && !manuscript.content_purged_at

  if (loading) return <PublicationShell>
    <div className="wrap author-flow-page manuscript-detail-page">
      <section className="author-panel author-live-state"><p className="kicker">Manuscript details</p><h2>Loading manuscript…</h2></section>
    </div>
  </PublicationShell>

  return <PublicationShell>
    <div className="wrap author-flow-page manuscript-detail-page md2">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Manuscript details</div>

      <AuthorPageError title="Manuscript unavailable." message={error} empty={!manuscript} />
      {fileError && <div className="author-prototype-notice author-error-banner" role="alert">{fileError}</div>}

      {manuscript && <>
        {/* 1. Compact header with the key facts */}
        <section className="md2-card">
          <div className="md2-head">
            <div className="md2-head-main">
              <div className="md2-tags">
                <span className="md2-type">{pretty(manuscript.manuscript_type)}</span>
                {submission?.status && <AuthorStatusPill tone={statusTone(submission.status)}>{pretty(submission.status)}</AuthorStatusPill>}
              </div>
              <h1 title={manuscript.title}>{manuscript.title}</h1>
              <p className="md2-file">{manuscript.manuscript_filename} · {formatBytes(manuscript.manuscript_bytes)} · uploaded {shortDate(manuscript.created_at)}</p>
            </div>
            <div className="md2-head-actions">
              <button type="button" className="md2-btn" disabled={!hasFile} onClick={() => setViewing(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>View
              </button>
              <button type="button" className="md2-btn" disabled={!hasFile || downloading} onClick={downloadFile}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>{downloading ? 'Downloading…' : 'Download'}
              </button>
              <button type="button" className="md2-btn dark" onClick={() => go('/author')}>Back to workspace</button>
            </div>
          </div>
          <div className="md2-metrics">
            <div><span>Readiness</span><b className={mechanical?.status === 'completed' ? 'good' : ''}>{mechanical?.status ? pretty(mechanical.status) : 'Not run'}</b></div>
            <div><span>Word count</span><b>{wordCount ? Number(wordCount).toLocaleString() : '—'}</b></div>
            <div><span>Venue matches</span><b>{matches.length || 0}</b></div>
            <div><span>Selected venue</span><b title={submission?.venue?.name || ''}>{submission?.venue?.name || 'Not selected'}</b></div>
            <div><span>Submission</span><b className={statusTone(submission?.status) === 'good' ? 'good' : ''}>{submission?.status ? pretty(submission.status) : 'Not submitted'}</b></div>
          </div>
        </section>

        <div className="md2-grid">
          <div className="md2-col">
            {/* 2. Overview */}
            <section className="md2-card">
              <div className="md2-sec-head"><div><p className="kicker">Overview</p><h2>Manuscript and author</h2></div></div>
              <div className="md2-sec-body">
                <dl className="md2-kv">
                  <div><dt>Author</dt><dd title={manuscript.author_name}>{manuscript.author_name || '—'}</dd></div>
                  <div><dt>Author email</dt><dd title={manuscript.author_email}>{manuscript.author_email || '—'}</dd></div>
                  <div><dt>Co-authors</dt><dd title={manuscript.coauthors || ''}>{manuscript.coauthors || 'None recorded'}</dd></div>
                  <div><dt>Last updated</dt><dd>{shortDate(manuscript.updated_at)}</dd></div>
                </dl>
                <div className="md2-texts">
                  <div className="md2-tbox wide"><dt>Abstract</dt><p>{manuscript.abstract || '—'}</p></div>
                  <div className="md2-tbox"><dt>Keywords</dt>
                    {Array.isArray(manuscript.keywords) && manuscript.keywords.length
                      ? <div className="md2-kw">{manuscript.keywords.map(keyword => <span key={keyword}>{keyword}</span>)}</div>
                      : <p>—</p>}
                  </div>
                  <div className="md2-tbox"><dt>AI-use disclosure</dt><p>{manuscript.disclosure || '—'}</p></div>
                  {manuscript.notes && <div className="md2-tbox wide"><dt>Author notes</dt><p>{manuscript.notes}</p></div>}
                </div>
              </div>
            </section>

            {/* 3. Readiness checks as one table, with a switch for the semantic review */}
            <section className="md2-card">
              <div className="md2-sec-head">
                <div><p className="kicker">Readiness</p><h2>Checks and findings</h2></div>
                <div className="md2-sec-tools">
                  {mechanical?.summary && <div className="md2-chips">
                    <span>{Number(mechanical.summary.blocking_issues || 0)} blocking</span>
                    <span>{Number(mechanical.summary.warnings || 0)} warnings</span>
                    <span className={mechanical.summary.ready_for_matching ? 'good' : 'warn'}>{mechanical.summary.ready_for_matching ? 'Ready for matching' : 'Needs attention'}</span>
                  </div>}
                  {semantic && <div className="md2-seg" role="tablist">
                    <button type="button" role="tab" aria-selected={checksView === 'checks'} className={checksView === 'checks' ? 'on' : ''} onClick={() => setChecksView('checks')}>Checks</button>
                    <button type="button" role="tab" aria-selected={checksView === 'semantic'} className={checksView === 'semantic' ? 'on' : ''} onClick={() => setChecksView('semantic')}>Semantic review</button>
                  </div>}
                </div>
              </div>
              {checksView === 'checks' || !semantic ? (findings.length ? <div className="md2-scroll"><table className="md2-table">
                <thead><tr><th>Check</th><th>Result</th><th>Finding</th><th>Source</th></tr></thead>
                <tbody>
                  {findings.map((finding, index) => <tr key={finding.code || index}>
                    <td className="name">{finding.label || pretty(finding.code)}</td>
                    <td><span className={`md2-res ${resultClass(finding.status)}`}>{resultLabel(finding.status)}</span></td>
                    <td>{finding.detail}</td>
                    <td className="src">{finding.source?.locator || '—'}</td>
                  </tr>)}
                </tbody>
              </table></div> : <p className="md2-empty">No deterministic readiness findings are stored yet.</p>) : <>
                {semantic.summary?.model && <div className="md2-model">Model: {semantic.summary.model} · advisory only; editors make the decision.</div>}
                {semanticFindings.length ? <div className="md2-scroll"><table className="md2-table">
                  <thead><tr><th>Area</th><th>Result</th><th>Observation</th></tr></thead>
                  <tbody>
                    {semanticFindings.map((finding, index) => <tr key={finding.code || index}>
                      <td className="name">{finding.label || finding.finding_type || `Finding ${index + 1}`}</td>
                      <td><span className={`md2-res ${resultClass(finding.status || finding.severity)}`}>{resultLabel(finding.status || finding.severity)}</span></td>
                      <td>{finding.detail || finding.summary || finding.claim || JSON.stringify(finding)}</td>
                    </tr>)}
                  </tbody>
                </table></div> : <p className="md2-empty" style={{ whiteSpace: 'pre-wrap' }}>{semantic.summary?.note || semantic.summary?.summary || 'Semantic readiness data is stored.'}</p>}
              </>}
            </section>

            {/* 4. Venue matches, compact */}
            <section className="md2-card">
              <div className="md2-sec-head">
                <div><p className="kicker">Venue matching</p><h2>Recorded venue matches</h2></div>
                {matches.length > 0 && <button type="button" className="md2-link" onClick={() => go('/author/venues')}>Open full comparison →</button>}
              </div>
              {matches.length ? <>
                <div className="md2-scroll"><table className="md2-table">
                  <thead><tr><th>Venue</th><th>Match</th><th>Status</th><th>Before submission</th></tr></thead>
                  <tbody>
                    {visibleMatches.map(match => {
                      const score = match.match_score?.score ?? null
                      const gap = (match.gaps || []).find(g => String(g || '').trim().length > 3)
                      return <tr key={match.id}>
                        <td><b>{match.venue?.name}</b><div className="src">{pretty(match.venue?.venue_type)}</div><VenueTrustBadge venue={match.venue} className="mt-1" /></td>
                        <td className={`md2-score ${score === null ? 'low' : scoreTone(score)}`}>{score === null ? '—' : <><strong>{score}%</strong><em>{match.match_score.label}</em></>}</td>
                        <td><AuthorStatusPill tone={statusTone(match.eligibility)}>{pretty(match.eligibility)}</AuthorStatusPill></td>
                        <td className={gap ? 'gap' : 'okt'}>{gap ? `! ${gap}` : 'Nothing required'}</td>
                      </tr>
                    })}
                  </tbody>
                </table></div>
                {sortedMatches.length > 5 && <button type="button" className="md2-more" onClick={() => setShowAllMatches(v => !v)}>
                  {showAllMatches ? 'Show fewer' : `Show all ${sortedMatches.length} venues`}
                </button>}
              </> : <p className="md2-empty">No venue matches have been recorded for this manuscript yet.</p>}
            </section>
          </div>

          {/* RIGHT: submission */}
          <aside className="md2-card md2-side">
            <div className="md2-sec-head">
              <div><p className="kicker">Latest venue submission</p><h2 title={submission?.venue?.name || ''}>{submission?.venue?.name || 'No venue selected yet'}</h2></div>
              {submission?.status && <AuthorStatusPill tone={statusTone(submission.status)}>{pretty(submission.status)}</AuthorStatusPill>}
            </div>
            {!submission ? <p className="md2-empty">This manuscript has not yet been attached to a venue submission.</p> : <>
              <div className="md2-sec-body">
                <div className="md2-row"><span>Venue configuration</span><b>{submission.venue_config_version ? `Version ${submission.venue_config_version}` : '—'}</b></div>
                <div className="md2-row"><span>Created</span><b>{shortDate(submission.created_at)}</b></div>
                <div className="md2-row"><span>Submitted</span><b>{shortDate(submission.submitted_at)}</b></div>
                <div className="md2-row"><span>Requirements</span><b>{requirements.configured ? (requirements.complete ? 'Complete' : 'Action required') : 'None configured'}</b></div>
                <div className="md2-row"><span>Retention</span><b>{submission.retention_purged_at ? 'Purged' : submission.retention_expires_at ? `Expires ${shortDate(submission.retention_expires_at)}` : 'No expiry recorded'}</b></div>
                {matchForSubmission?.fit_summary && <div className="md2-note"><b>Venue fit</b>{matchForSubmission.fit_summary}</div>}
                {brief.editor_summary && <div className="md2-note"><b>Editorial brief</b><span style={{ whiteSpace: 'pre-wrap' }}>{brief.editor_summary}</span></div>}
                {decision && Object.keys(decision).length > 0 && <div className="md2-note decision">
                  <b>Human editorial decision</b>
                  <strong>{pretty(decision.decision || submission.status)}</strong>
                  {decision.note && <span style={{ whiteSpace: 'pre-wrap' }}>{decision.note}</span>}
                  <small>{decision.decided_by ? `Decision by ${decision.decided_by}` : ''}{decision.decided_at ? ` · ${shortDate(decision.decided_at)}` : ''}</small>
                </div>}
              </div>
              {requirements.configured && <details className="md2-details">
                <summary><span>Venue requirements <em>{(requirements.items || []).length}</em></span><i aria-hidden="true">▾</i></summary>
                <div className="md2-list">
                  {(requirements.items || []).map(item => <div key={item.key} className="md2-list-item">
                    <span className={item.completed ? 'ok' : 'todo'}>{item.completed ? '✓' : '!'}</span>
                    <div><b>{item.label}</b><small>{item.completed ? (item.file?.name ? `Uploaded: ${item.file.name}` : 'Complete') : item.required ? 'Required' : 'Optional'}</small></div>
                  </div>)}
                </div>
              </details>}
              {evidenceGroups.length > 0 && <details className="md2-details">
                <summary><span>Evidence trail <em>{submission.evidence.length}</em></span><i aria-hidden="true">▾</i></summary>
                <div className="md2-list">
                  {evidenceGroups.map((group, index) => <div key={index} className="md2-list-item">
                    <div><b>{pretty(String(group.title).replace(/^agent:/, '').replaceAll(':', ' · '))}</b><small>{group.detail}</small></div>
                    {group.count > 1 && <span className="times">×{group.count}</span>}
                  </div>)}
                </div>
              </details>}
            </>}
            <div className="md2-side-actions">
              <button className="md2-btn" type="button" onClick={() => go('/author/readiness')}>Open readiness</button>
              <button className="md2-btn" type="button" onClick={() => go('/author/venues')}>Open venue matches</button>
              {submission?.id && <button className="md2-btn primary" type="button" onClick={() => go('/author/status')}>Open submission status</button>}
            </div>
          </aside>
        </div>
      </>}
    </div>

    <div className="admin-demo-root" />
    {manuscript && viewing && <Suspense fallback={null}><ManuscriptViewer
      open={viewing}
      onClose={() => setViewing(false)}
      submissionId={manuscript.id}
      filename={manuscript.manuscript_filename || ''}
      fileBytes={manuscript.manuscript_bytes}
      loadBlob={async () => (await loadAuthorFile(manuscript.id)).blob}
      onDownload={downloadFile}
      downloading={downloading}
    /></Suspense>}
  </PublicationShell>
}
