import React, { useEffect, useMemo, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorStatusPill } from '../components/AuthorFlow.jsx'
import {
  authorApi,
  clearAuthorSession,
  currentManuscriptPath,
  currentSubmissionPath,
  friendlyAuthorError,
  getAuthorSession,
  fetchAuthorSession,
  fetchAuthorManuscripts,
  authorLogout,
  saveAuthorSession
} from '../authorApi.js'

const journey = [
  { step: '01', title: 'Upload once', copy: 'Add your manuscript and core author details in one secure workspace.' },
  { step: '02', title: 'Check readiness', copy: 'Run deterministic checks and grounded semantic readiness analysis.' },
  { step: '03', title: 'Compare venues', copy: 'Compare participating outlets against their own configured scope, policies, and priorities.' },
  { step: '04', title: 'You choose', copy: 'Select the destination. The system prepares the venue-specific packet for human editorial review.' },
]

function statusLabel(status) {
  if (!status) return 'Manuscript created'
  return String(status).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

export default function AuthorDashboard() {
  const [manuscript, setManuscript] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authorUser, setAuthorUser] = useState(null)
  const [manuscriptsList, setManuscriptsList] = useState([])

  async function loadCurrent() {
    try {
      const user = await fetchAuthorSession()
      if (user) {
        setAuthorUser(user)
        const res = await fetchAuthorManuscripts()
        setManuscriptsList(res.manuscripts || [])
      }
    } catch (err) {
      console.error(err)
    }

    const session = getAuthorSession()
    if (!session.manuscriptId || !session.accessToken) {
      setLoading(false)
      return
    }

    try {
      const manuscriptPayload = await authorApi(currentManuscriptPath('/'))
      setManuscript(manuscriptPayload.manuscript)
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

  useEffect(() => {
    loadCurrent()
  }, [])

  const stats = useMemo(() => {
    const readiness = manuscript?.latest_readiness?.summary || {}
    const needsAttention = Number(readiness.blocking_issues || 0) + Number(readiness.warnings || 0) > 0
    const submitted = ['submitted', 'under_review', 'revision_requested', 'accepted', 'rejected'].includes(submission?.status)
    const hasDecision = ['accepted', 'rejected', 'revision_requested'].includes(submission?.status) || Boolean(submission?.decision && Object.keys(submission.decision).length)
    return {
      drafts: manuscript && !submitted ? 1 : 0,
      attention: needsAttention ? 1 : 0,
      submitted: submitted ? 1 : 0,
      decisions: hasDecision ? 1 : 0,
    }
  }, [manuscript, submission])

  function resume() {
    if (submission?.id) return go('/author/status')
    if (manuscript?.parsed_profile?.semantic) return go('/author/venues')
    return go('/author/readiness')
  }

  function forgetSession() {
    clearAuthorSession()
    setManuscript(null)
    setSubmission(null)
    setError('')
  }

  async function handleLogout() {
    await authorLogout()
    setAuthorUser(null)
    setManuscriptsList([])
  }

  function viewManuscript(ms) {
    saveAuthorSession({
      manuscriptId: ms.id,
      accessToken: ms.access_token_hash ? '' : getAuthorSession().accessToken, // Note: real access token needs to be issued, but for now we rely on cookie
    })
    go('/author/status')
  }

  return <PublicationShell>
    <div className="wrap author-dashboard">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Author workspace</div>

      <section className="author-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
          <div>
            <p className="kicker">Author workspace</p>
            <h1 className="publication-title">{authorUser ? `Welcome, ${authorUser.name}` : 'Your manuscript workspace.'}</h1>
            <p className="publication-lede">Prepare a manuscript, check its readiness, compare participating outlets, choose where you want to submit, and follow the venue-specific packet.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
            {authorUser ? (
              <button className="author-secondary-button" type="button" onClick={handleLogout}>Log out</button>
            ) : (
              <button className="author-secondary-button" type="button" onClick={() => go('/author/login')}>Log in</button>
            )}
            <button className="copper-button author-primary-action" type="button" onClick={() => go('/author/new')}>Start a new submission</button>
          </div>
        </div>
      </section>

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Current manuscript unavailable.</b> {error}</div>}

      <section className="author-stats" aria-label="Submission overview">
        <article className="author-stat-card"><span className="author-stat-value">{stats.drafts}</span><span className="author-stat-label">Drafts</span><p>Current browser-session manuscripts not formally submitted.</p></article>
        <article className="author-stat-card"><span className="author-stat-value">{stats.attention}</span><span className="author-stat-label">Needs attention</span><p>Current manuscript with readiness warnings or blocking checks.</p></article>
        <article className="author-stat-card"><span className="author-stat-value">{stats.submitted}</span><span className="author-stat-label">Submitted</span><p>Current venue submission recorded with the editorial workflow.</p></article>
        <article className="author-stat-card"><span className="author-stat-value">{stats.decisions}</span><span className="author-stat-label">Decisions</span><p>Editorial decisions available in the current session.</p></article>
      </section>

      <div className="author-dashboard-grid">
        <section className="author-panel author-submissions-panel">
          <div className="author-panel-heading">
            <div><p className="kicker">{authorUser ? 'Your account' : 'Current browser session'}</p><h2>Manuscript activity</h2></div>
          </div>

          {loading ? <div className="author-empty-state"><h3>Loading your manuscript…</h3></div> :
            (authorUser && manuscriptsList.length > 0) ? (
              <div className="author-manuscripts-list">
                {manuscriptsList.map(ms => (
                  <div key={ms.id} className="author-live-manuscript" style={{ marginBottom: '1rem' }}>
                    <div>
                      <span className="author-venue-type">{String(ms.manuscript_type || 'manuscript').replaceAll('_', ' ')}</span>
                      <h3>{ms.title}</h3>
                      <p>{ms.manuscript_filename}</p>
                    </div>
                    <div className="author-live-manuscript-meta">
                      <AuthorStatusPill tone={ms.latest_submission?.status === 'packet_ready' ? 'good' : 'neutral'}>{statusLabel(ms.latest_submission?.status)}</AuthorStatusPill>
                    </div>
                    <div className="author-live-manuscript-actions">
                      <button className="copper-button" type="button" onClick={() => viewManuscript(ms)}>View details</button>
                    </div>
                  </div>
                ))}
              </div>
            ) :
            manuscript ? <div className="author-live-manuscript">
              <div>
                <span className="author-venue-type">{String(manuscript.manuscript_type || 'manuscript').replaceAll('_', ' ')}</span>
                <h3>{manuscript.title}</h3>
                <p>{manuscript.manuscript_filename}</p>
              </div>
              <div className="author-live-manuscript-meta">
                <AuthorStatusPill tone={submission?.status === 'packet_ready' ? 'good' : 'neutral'}>{statusLabel(submission?.status)}</AuthorStatusPill>
                <span>{manuscript.latest_readiness?.summary?.word_count ? `${manuscript.latest_readiness.summary.word_count.toLocaleString()} words` : 'Readiness available after analysis'}</span>
              </div>
              <div className="author-live-manuscript-actions">
                <button className="copper-button" type="button" onClick={resume}>Continue workflow</button>
                <button className="author-secondary-button" type="button" onClick={forgetSession}>Clear this browser session</button>
              </div>
            </div> : <div className="author-empty-state">
              <div className="author-empty-mark" aria-hidden="true">＋</div>
              <h3>No active manuscript in this browser session</h3>
              <p>Start with one manuscript. The backend will store readiness, venue matches, evidence, submission status, and transfers while this browser keeps the secure access token.</p>
              <button className="copper-button" type="button" onClick={() => go('/author/new')}>Start your first submission</button>
            </div>}
        </section>

        <aside className="author-sidebar">
          <section className="author-panel author-guide-card">
            <p className="kicker">Before you submit</p>
            <h2>What the workspace checks</h2>
            <div className="author-check-list">
              <div><span aria-hidden="true">✓</span><p><b>Readiness</b><small>Structure, required information, disclosures, and grounded semantic observations.</small></p></div>
              <div><span aria-hidden="true">✓</span><p><b>Venue fit</b><small>Scope, article type, policies, methods, and current editorial priorities.</small></p></div>
              <div><span aria-hidden="true">✓</span><p><b>Evidence</b><small>Material findings point back to manuscript text, venue policy, or verified external sources.</small></p></div>
            </div>
          </section>

          <section className="author-panel author-human-card">
            <span className="author-human-pill">Human decision</span>
            <h2>AI prepares. Editors decide.</h2>
            <p>The workspace assists with preparation and routing. Final editorial and publication decisions remain with human editors.</p>
          </section>
        </aside>
      </div>

      <section className="author-journey">
        <div className="author-section-heading"><p className="kicker">How it works</p><h2>From manuscript to a venue-specific packet.</h2></div>
        <div className="author-journey-grid">
          {journey.map(item => <article className="author-journey-card" key={item.step}><span>{item.step}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}
        </div>
      </section>
    </div>
  </PublicationShell>
}
