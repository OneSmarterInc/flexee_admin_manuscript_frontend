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
  resendAuthorVerification,
  saveAuthorSession
} from '../authorApi.js'

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
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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
    if (!session.manuscriptId) {
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

  const statuses = useMemo(() => {
    const values = manuscriptsList.map(ms => ms.latest_submission?.status || 'manuscript_created')
    return [...new Set(values)]
  }, [manuscriptsList])

  const filteredManuscripts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return manuscriptsList.filter(ms => {
      const rawStatus = ms.latest_submission?.status || 'manuscript_created'
      const matchesStatus = statusFilter === 'all' || rawStatus === statusFilter
      const haystack = [
        ms.title,
        ms.manuscript_filename,
        ms.manuscript_type,
        statusLabel(rawStatus),
      ].filter(Boolean).join(' ').toLowerCase()
      return matchesStatus && (!query || haystack.includes(query))
    })
  }, [manuscriptsList, search, statusFilter])

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
    setManuscript(null)
    setSubmission(null)
    go('/author/login')
  }

  async function handleResendVerification() {
    setVerifyBusy(true)
    setVerifyMessage('')
    try {
      const result = await resendAuthorVerification()
      setVerifyMessage(result.detail || 'Verification email sent.')
    } catch (err) {
      setVerifyMessage(err.message || 'Verification email could not be sent.')
    } finally {
      setVerifyBusy(false)
    }
  }

  function viewManuscript(ms) {
    const latestSubmission = ms.latest_submission || null
    saveAuthorSession({
      manuscriptId: ms.id,
      manuscriptTitle: ms.title,
      submissionId: latestSubmission?.id || null,
      selectedVenueId: latestSubmission?.venue?.id || null,
      selectedVenueSlug: latestSubmission?.venue?.slug || null,
    })
    go('/author/manuscript-details')
  }

  return <PublicationShell>
    <div className="wrap author-dashboard author-dashboard-compact">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Author workspace</div>

      <section className="author-hero author-compact-hero">
        <div className="author-compact-hero-row">
          <div>
            <p className="kicker">Author workspace</p>
            <h1 className="publication-title">{authorUser ? \`Welcome, \${authorUser.name}\` : 'Your manuscript workspace.'}</h1>
            <p className="publication-lede">Manage manuscripts, readiness, venue submissions, and editorial decisions.</p>
          </div>
          <div className="author-compact-actions">
            <button className="author-secondary-button" type="button" onClick={handleLogout}>Log out</button>
            <button className="copper-button author-primary-action" type="button" onClick={() => go('/author/new')}>New submission</button>
          </div>
        </div>
      </section>

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Current manuscript unavailable.</b> {error}</div>}
      {authorUser && !authorUser.email_verified && <div className="author-prototype-notice author-compact-verification" role="status">
        <b>Verify your email before uploading.</b>
        <button className="author-secondary-button" type="button" onClick={handleResendVerification} disabled={verifyBusy}>{verifyBusy ? 'Sending…' : 'Resend email'}</button>
        {verifyMessage && <span>{verifyMessage}</span>}
      </div>}

      <section className="author-stats author-compact-stats" aria-label="Submission overview">
        <article className="author-stat-card"><span className="author-stat-value">{stats.drafts}</span><span className="author-stat-label">Drafts</span></article>
        <article className="author-stat-card"><span className="author-stat-value">{stats.attention}</span><span className="author-stat-label">Needs attention</span></article>
        <article className="author-stat-card"><span className="author-stat-value">{stats.submitted}</span><span className="author-stat-label">Submitted</span></article>
        <article className="author-stat-card"><span className="author-stat-value">{stats.decisions}</span><span className="author-stat-label">Decisions</span></article>
      </section>

      <section className="author-panel author-manuscript-table-card">
        <div className="author-table-toolbar">
          <div>
            <p className="kicker">Your account</p>
            <h2>Manuscripts</h2>
          </div>
          <div className="author-table-filters">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, file, type or status"
              aria-label="Search manuscripts"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter manuscripts by status">
              <option value="all">All statuses</option>
              {statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="author-table-empty">Loading manuscripts…</div> :
          (authorUser && manuscriptsList.length > 0) ? (
            <div className="author-manuscript-table-wrap">
              <table className="author-manuscript-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>File</th>
                    <th>Status</th>
                    <th aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManuscripts.map(ms => (
                    <tr key={ms.id}>
                      <td><span className="author-table-type">{String(ms.manuscript_type || 'manuscript').replaceAll('_', ' ')}</span></td>
                      <td><b>{ms.title}</b></td>
                      <td><span className="author-table-file">{ms.manuscript_filename}</span></td>
                      <td><AuthorStatusPill tone={ms.latest_submission?.status === 'packet_ready' ? 'good' : 'neutral'}>{statusLabel(ms.latest_submission?.status)}</AuthorStatusPill></td>
                      <td><button className="author-table-action" type="button" onClick={() => viewManuscript(ms)}>View details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredManuscripts.length === 0 && <div className="author-table-empty">No manuscripts match your search or filter.</div>}
            </div>
          ) :
          manuscript ? <div className="author-session-compact">
            <div><b>{manuscript.title}</b><span>{manuscript.manuscript_filename}</span></div>
            <AuthorStatusPill tone={submission?.status === 'packet_ready' ? 'good' : 'neutral'}>{statusLabel(submission?.status)}</AuthorStatusPill>
            <div className="author-session-actions">
              <button className="copper-button" type="button" onClick={resume}>Continue workflow</button>
              <button className="author-secondary-button" type="button" onClick={forgetSession}>Clear session</button>
            </div>
          </div> :
          <div className="author-table-empty">
            <b>No manuscripts yet.</b>
            <span> Start your first submission to create a manuscript record.</span>
          </div>}
      </section>

      <div className="author-compact-info-grid">
        <section className="author-panel author-guide-card">
          <p className="kicker">Workspace checks</p>
          <div className="author-check-list author-check-list-compact">
            <div><span aria-hidden="true">✓</span><p><b>Readiness</b><small>Structure, required information and disclosures.</small></p></div>
            <div><span aria-hidden="true">✓</span><p><b>Venue fit</b><small>Scope, article type, policies and methods.</small></p></div>
            <div><span aria-hidden="true">✓</span><p><b>Evidence</b><small>Findings remain linked to their supporting sources.</small></p></div>
          </div>
        </section>

        <section className="author-panel author-human-card author-human-card-compact">
          <span className="author-human-pill">Human decision</span>
          <h2>AI prepares. Editors decide.</h2>
          <p>AI supports preparation and routing; final editorial decisions remain with human editors.</p>
        </section>
      </div>
    </div>
  </PublicationShell>
}
