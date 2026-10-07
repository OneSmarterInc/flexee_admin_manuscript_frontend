import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorStatusPill } from '../components/AuthorFlow.jsx'
import AdminModal from '../components/admin/AdminModal.jsx'
// Loaded only when View is clicked (keeps PDF/Word/ZIP libraries out of the main bundle).
const ManuscriptViewer = lazy(() => import('../components/admin/ManuscriptViewer.jsx'))
import { apiBlob } from '../api.js'
import { AuthorProfileMenu } from '../components/AuthorAccountMenu.jsx'
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
import VenueTrustBadge from '../components/VenueTrust.jsx'

const SUBMITTED_STATUSES = ['submitted', 'under_review', 'revision_requested', 'accepted', 'rejected']
const DECISION_STATUSES = ['accepted', 'rejected', 'revision_requested']

function hasReadinessIssues(ms) {
  const summary = ms?.latest_readiness?.summary || {}
  return Number(summary.blocking_issues || 0) + Number(summary.warnings || 0) > 0
}

function formatUpdated(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

// The author's own file: the session cookie, or the manuscript token for token-only sessions.
async function loadAuthorFile(manuscriptId) {
  const session = getAuthorSession()
  const headers = session.accessToken && session.manuscriptId === manuscriptId ? { 'X-Manuscript-Token': session.accessToken } : {}
  return apiBlob(`/api/author/manuscripts/${manuscriptId}/file/`, { headers })
}

function scoreTone(score) {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'good'
  if (score >= 35) return 'partial'
  return 'low'
}

const PLACEHOLDERS = [/^(why )?the manuscript aligns( with the venue)?\.?$/i, /^specific missing or conflicting requirement\.?$/i]
function firstGap(match) {
  return (match.gaps || []).map(g => String(g || '').trim()).find(g => g.length > 3 && !PLACEHOLDERS.some(p => p.test(g))) || ''
}

const Icon = {
  eye: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  download: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  search: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  draft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>,
  attention: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>,
  submitted: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>,
  decision: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>,
}

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
  const [quickFilter, setQuickFilter] = useState('')
  const [viewing, setViewing] = useState(null)
  const [downloadingId, setDownloadingId] = useState('')
  const [matchesFor, setMatchesFor] = useState(null)
  const [matches, setMatches] = useState([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchesError, setMatchesError] = useState('')
  const [notice, setNotice] = useState('')

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
    if (manuscriptsList.length) {
      return {
        drafts: manuscriptsList.filter(ms => !SUBMITTED_STATUSES.includes(ms.latest_submission?.status)).length,
        attention: manuscriptsList.filter(hasReadinessIssues).length,
        submitted: manuscriptsList.filter(ms => SUBMITTED_STATUSES.includes(ms.latest_submission?.status)).length,
        decisions: manuscriptsList.filter(ms => DECISION_STATUSES.includes(ms.latest_submission?.status)).length,
      }
    }
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
  }, [manuscript, submission, manuscriptsList])

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
      const status = ms.latest_submission?.status
      const matchesQuick = !quickFilter
        || (quickFilter === 'drafts' && !SUBMITTED_STATUSES.includes(status))
        || (quickFilter === 'attention' && hasReadinessIssues(ms))
        || (quickFilter === 'submitted' && SUBMITTED_STATUSES.includes(status))
        || (quickFilter === 'decisions' && DECISION_STATUSES.includes(status))
      return matchesStatus && matchesQuick && (!query || haystack.includes(query))
    })
  }, [manuscriptsList, search, statusFilter, quickFilter])

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

  async function downloadManuscript(ms) {
    setDownloadingId(ms.id)
    try {
      const { blob } = await loadAuthorFile(ms.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = ms.manuscript_filename || 'manuscript'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setNotice(err.message || 'The file could not be downloaded.')
    } finally {
      setDownloadingId('')
    }
  }

  async function openMatches(ms) {
    setMatchesFor(ms)
    setMatches([])
    setMatchesError('')
    setMatchesLoading(true)
    try {
      const payload = await authorApi(`/api/author/manuscripts/${ms.id}/matches/`)
      setMatches(payload.matches || [])
      // Opening the list clears the "new" badge for this manuscript.
      await authorApi(`/api/author/manuscripts/${ms.id}/matches/seen/`, { method: 'POST', body: '{}' })
      setManuscriptsList(list => list.map(item => item.id === ms.id
        ? { ...item, new_match_count: 0, match_count: (payload.matches || []).length }
        : item))
    } catch (err) {
      setMatchesError(friendlyAuthorError(err))
    } finally {
      setMatchesLoading(false)
    }
  }

  function openFullComparison(ms) {
    const latestSubmission = ms.latest_submission || null
    saveAuthorSession({
      manuscriptId: ms.id,
      accessToken: null,
      manuscriptTitle: ms.title,
      submissionId: latestSubmission?.id || null,
      selectedVenueId: latestSubmission?.venue?.id || null,
      selectedVenueSlug: latestSubmission?.venue?.slug || null,
    })
    go('/author/venues')
  }

  function viewManuscript(ms) {
    const latestSubmission = ms.latest_submission || null
    saveAuthorSession({
      manuscriptId: ms.id,
      accessToken: null,
      manuscriptTitle: ms.title,
      submissionId: latestSubmission?.id || null,
      selectedVenueId: latestSubmission?.venue?.id || null,
      selectedVenueSlug: latestSubmission?.venue?.slug || null,
    })
    go('/author/manuscript-details')
  }

  const sortedMatches = matches.slice().sort((a, b) => (b.match_score?.score ?? -1) - (a.match_score?.score ?? -1))
  const newMatches = matches.filter(match => match.is_new).length
  const acceptedCount = manuscriptsList.filter(ms => DECISION_STATUSES.includes(ms.latest_submission?.status) && ms.latest_submission?.status === 'accepted').length
  const firstName = authorUser?.name ? String(authorUser.name).trim().split(/\s+/)[0] : ''
  const initials = authorUser?.name ? String(authorUser.name).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() : 'A'
  const lastActivity = manuscriptsList.length ? formatUpdated(manuscriptsList.map(ms => ms.updated_at).sort().slice(-1)[0]) : ''
  const summaryLine = manuscriptsList.length
    ? `${manuscriptsList.length} manuscript${manuscriptsList.length === 1 ? '' : 's'}${acceptedCount ? ` · ${acceptedCount} accepted` : ''}${lastActivity ? ` · last activity ${lastActivity.startsWith('Today') ? lastActivity.replace('Today,', 'today at') : lastActivity}` : ''}`
    : 'Manage manuscripts, readiness, venue submissions and decisions from one workspace.'

  return <PublicationShell>
    <div className="wrap author-dashboard author-dashboard-compact author-dash">
      <div className="crumb author-dash-crumb"><a href="https://www.flexee.org/">Flexee</a> / Author workspace</div>

      <section className="author-dash-bar">
        <div className="author-dash-id">
          <div className="author-dash-monogram" aria-hidden="true">{initials}</div>
          <div className="author-dash-id-copy">
            <h1>{authorUser ? `Welcome back, ${firstName || authorUser.name}` : 'Your manuscript workspace.'}</h1>
            <p className="author-dash-sub" title={summaryLine}>{summaryLine}</p>
          </div>
        </div>
        <div className="author-dash-chips" aria-label="Submission overview">
          {[['drafts', 'Drafts', 'Not yet submitted', 'i-draft', Icon.draft],
            ['attention', 'Needs attention', 'Fix before submitting', 'i-attn', Icon.attention],
            ['submitted', 'Submitted', 'With a venue now', 'i-sub', Icon.submitted],
            ['decisions', 'Decisions', 'Accepted or returned', 'i-dec', Icon.decision]].map(([key, label, hint, tone, icon]) =>
            <button key={key} type="button" className={`author-dash-chip ${quickFilter === key ? 'active' : ''}`}
              onClick={() => setQuickFilter(value => value === key ? '' : key)} aria-pressed={quickFilter === key}
              data-tip={quickFilter === key ? 'Show all manuscripts' : hint}>
              <span className={`author-dash-chip-icon ${tone}`}>{icon}</span>
              <b>{stats[key]}</b>{label}
            </button>)}
        </div>
        <div className="author-dash-bar-actions">
          <button className="author-dash-btn" type="button" onClick={() => go('/journals')}>Journal index</button>
          <button className="author-dash-btn primary" type="button" onClick={() => go('/author/new')}>{Icon.plus}New submission</button>
          <AuthorProfileMenu onLogout={handleLogout} />
        </div>
      </section>

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Current manuscript unavailable.</b> {error}</div>}
      {notice && <div className="author-prototype-notice author-error-banner" role="alert">{notice} <button className="author-text-link" type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
      {authorUser && !authorUser.email_verified && <div className="author-prototype-notice author-compact-verification" role="status">
        <b>Verify your email before uploading.</b>
        <button className="author-secondary-button" type="button" onClick={handleResendVerification} disabled={verifyBusy}>{verifyBusy ? 'Sending…' : 'Resend email'}</button>
        {verifyMessage && <span>{verifyMessage}</span>}
      </div>}

      <section className="author-dash-card">
        <div className="author-dash-table-head">
          <div>
            <h2>Manuscripts</h2>
            <p className="author-dash-sub">View, download and see matching venues for every manuscript.</p>
          </div>
          <div className="author-dash-tools">
            <label className="author-dash-search">
              {Icon.search}
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search title, file, type or status" aria-label="Search manuscripts" />
            </label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter manuscripts by status">
              <option value="all">All statuses</option>
              {statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="author-table-empty">Loading manuscripts…</div> :
          (authorUser && manuscriptsList.length > 0) ? (
            <>
              <div className="author-dash-scroll">
                <table className="author-dash-table">
                  <colgroup><col className="c-ms" /><col className="c-type" /><col className="c-status" /><col className="c-upd" /><col className="c-act" /></colgroup>
                  <thead>
                    <tr><th>Manuscript</th><th>Type</th><th>Status</th><th>Updated</th><th className="right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredManuscripts.map(ms => {
                      const rawStatus = ms.latest_submission?.status
                      const good = DECISION_STATUSES.includes(rawStatus) ? rawStatus === 'accepted' : rawStatus === 'packet_ready'
                      return <tr key={ms.id}>
                        <td>
                          <div className="author-dash-title" title={ms.title}>{ms.title}</div>
                          <div className="author-dash-file" title={ms.manuscript_filename}>{ms.manuscript_filename}</div>
                        </td>
                        <td><span className="author-dash-type">{String(ms.manuscript_type || 'manuscript').replaceAll('_', ' ')}</span></td>
                        <td><span className={`author-dash-status ${good ? 'ok' : ''}`}><i></i>{statusLabel(rawStatus)}</span></td>
                        <td className="author-dash-upd">{formatUpdated(ms.updated_at || ms.created_at)}</td>
                        <td>
                          <div className="author-dash-actions">
                            <button type="button" className="author-dash-icon" data-tip="View manuscript" aria-label={`View ${ms.title}`}
                              disabled={ms.has_file === false} onClick={() => setViewing(ms)}>{Icon.eye}</button>
                            <button type="button" className="author-dash-icon" data-tip={downloadingId === ms.id ? 'Downloading…' : 'Download'} aria-label={`Download ${ms.title}`}
                              disabled={ms.has_file === false || downloadingId === ms.id} onClick={() => downloadManuscript(ms)}>{Icon.download}</button>
                            <button type="button" className="author-dash-match" disabled={!ms.match_count}
                              title={ms.match_count ? 'See matching venues' : 'No venue matches yet. Continue the workflow from View details.'}
                              onClick={() => openMatches(ms)}>
                              {Icon.target}<span className="lbl">Venue matches</span>
                              <span className="count">{ms.match_count || '–'}</span>
                              {ms.new_match_count > 0 && <span className="dot" title={`${ms.new_match_count} new venue${ms.new_match_count === 1 ? '' : 's'}`}>{ms.new_match_count}</span>}
                            </button>
                            <button type="button" className="author-dash-details" onClick={() => viewManuscript(ms)}>View details</button>
                          </div>
                        </td>
                      </tr>
                    })}
                  </tbody>
                </table>
                {filteredManuscripts.length === 0 && <div className="author-table-empty">No manuscripts match your search or filter.</div>}
              </div>
              <div className="author-dash-foot">
                <span>Showing {filteredManuscripts.length} of {manuscriptsList.length} manuscript{manuscriptsList.length === 1 ? '' : 's'}</span>
                <span className="author-dash-legend"><b>●</b> new venues since you last looked</span>
              </div>
            </>
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

    {/* Host for pop-ups: admin pop-up styles are scoped to this class. */}
    <div className="admin-demo-root author-dash-modal-host" />

    {viewing && <Suspense fallback={null}><ManuscriptViewer
      open={Boolean(viewing)}
      onClose={() => setViewing(null)}
      submissionId={viewing?.id}
      filename={viewing?.manuscript_filename || ''}
      fileBytes={viewing?.manuscript_bytes}
      loadBlob={viewing ? async () => (await loadAuthorFile(viewing.id)).blob : null}
      onDownload={() => viewing && downloadManuscript(viewing)}
      downloading={Boolean(viewing && downloadingId === viewing.id)}
    /></Suspense>}

    <AdminModal open={Boolean(matchesFor)} onClose={() => setMatchesFor(null)} labelledBy="author-matches-title" maxWidth="max-w-[1040px]">
      <div className="border-b border-line bg-gradient-to-r from-white via-white to-flexee-50 px-6 py-4 pr-16">
        <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-flexee-600">Venue matches</div>
        <h3 id="author-matches-title" className="serif mt-0.5 text-[28px] leading-none">{matchesFor?.title}</h3>
        <div className="mt-1 text-[13px] text-muted">{String(matchesFor?.manuscript_type || '').replaceAll('_', ' ')} · {matchesFor?.manuscript_filename} · checked against every active venue, updated when new venues are added.</div>
      </div>
      <div className="max-h-[62vh] overflow-auto px-6 py-4">
        {matchesLoading && <div className="py-8 text-center text-[14px] text-muted">Loading venue matches…</div>}
        {matchesError && <div className="admin-error venue-admin-message">{matchesError}</div>}
        {!matchesLoading && !matchesError && newMatches > 0 && <div className="mb-3 flex items-center gap-2 rounded-xl border border-flexee-200 bg-flexee-50 px-3 py-2 text-[13px] font-bold text-flexee-700">
          ★ {newMatches} new venue{newMatches === 1 ? ' was' : 's were'} added since you last looked. {newMatches === 1 ? 'It is' : 'They are'} marked <span className="rounded-full bg-flexee-500 px-2 py-0.5 text-[10.5px] font-extrabold text-white">New</span>
        </div>}
        {!matchesLoading && !matchesError && <table className="w-full border-collapse text-[13.5px]">
          <thead><tr className="text-left text-[11px] font-extrabold uppercase tracking-[.07em] text-muted">
            <th className="border-b border-line bg-[#faf7f4] px-3 py-2">Venue</th>
            <th className="border-b border-line bg-[#faf7f4] px-3 py-2">Match</th>
            <th className="border-b border-line bg-[#faf7f4] px-3 py-2">Status</th>
            <th className="border-b border-line bg-[#faf7f4] px-3 py-2">Before submission</th>
          </tr></thead>
          <tbody>
            {sortedMatches.map(match => {
              const score = match.match_score?.score ?? null
              const tone = score === null ? 'low' : scoreTone(score)
              const gap = firstGap(match)
              const statusText = match.eligibility === 'eligible' ? 'Eligible' : match.eligibility === 'ineligible' ? 'Not eligible' : 'Needs changes'
              return <tr key={match.id} className="align-top">
                <td className="border-b border-[#f0e7e0] px-3 py-2.5">
                  <div className="font-extrabold">{match.venue?.name}{match.is_new && <span className="ml-1.5 rounded-full bg-flexee-500 px-2 py-0.5 align-[2px] text-[10.5px] font-extrabold text-white">New</span>}</div>
                  <div className="text-[12px] capitalize text-muted">{match.venue?.venue_type}{match.venue?.organization?.name ? ` · ${match.venue.organization.name}` : ''}</div>
                  <VenueTrustBadge venue={match.venue} className="mt-1" />
                </td>
                <td className={`author-dash-score ${tone} border-b border-[#f0e7e0] px-3 py-2.5`}>
                  {score === null ? <span className="text-muted">Not scored</span> : <>
                    <div className="whitespace-nowrap"><strong>{score}%</strong><em>{match.match_score.label}</em></div>
                    <div className="author-dash-score-track"><span style={{ width: `${score}%` }}></span></div>
                  </>}
                </td>
                <td className="border-b border-[#f0e7e0] px-3 py-2.5">
                  <span className={`author-dash-status ${match.eligibility === 'eligible' ? 'ok' : match.eligibility === 'ineligible' ? 'no' : ''}`}><i></i>{statusText}</span>
                </td>
                <td className="border-b border-[#f0e7e0] px-3 py-2.5">
                  {gap ? <span className="text-[13px] text-[#92400e]">! {gap}</span> : <span className="text-[13px] font-bold text-green-700">Nothing required</span>}
                </td>
              </tr>
            })}
          </tbody>
        </table>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3">
        <span className="text-[12.5px] text-muted">Match % explains fit (scope 40 · type 25 · requirements 20 · methods 15). You choose the destination.</span>
        <button type="button" className="shine rounded-xl bg-flexee-500 px-4 py-2 text-[13px] font-extrabold text-white shadow-orange" onClick={() => matchesFor && openFullComparison(matchesFor)}>
          Open full venue comparison
        </button>
      </div>
    </AdminModal>
  </PublicationShell>
}
