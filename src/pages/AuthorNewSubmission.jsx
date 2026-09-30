import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice } from '../components/AuthorFlow.jsx'
import {
  authorApi,
  clearAuthorSession,
  createAuthorManuscript,
  currentManuscriptPath,
  friendlyAuthorError,
  saveAuthorSession,
} from '../authorApi.js'

const MANUSCRIPT_TYPES = [
  ['research_article', 'Research article'],
  ['practitioner_article', 'Practitioner article'],
  ['review_article', 'Review article'],
  ['case_study', 'Case study'],
  ['conference_paper', 'Conference paper'],
  ['book', 'Book manuscript'],
  ['other', 'Other'],
]

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function buildPayload(form) {
  const raw = new FormData(form)
  const payload = new FormData()
  payload.set('title', raw.get('title') || '')
  payload.set('author', raw.get('author') || '')
  payload.set('email', raw.get('email') || '')
  payload.set('coauthors', raw.get('coauthors') || '')
  payload.set('manuscript_type', raw.get('manuscriptType') || 'other')
  payload.set('abstract', raw.get('abstract') || '')
  payload.set('keywords', raw.get('keywords') || '')
  payload.set('disclosure', raw.get('disclosure') || '')
  payload.set('notes', raw.get('notes') || '')
  payload.set('attestation', 'true')
  const file = raw.get('manuscript')
  // An empty file input still yields a File with no name; only send a real file.
  if (file && file.name) payload.set('manuscript', file)
  return payload
}

/*
 * mode="create" (/author/new): a blank form that starts a new manuscript.
 * mode="edit" (/author/manuscript): the active manuscript, pre-filled and
 * editable until it is submitted to a venue.
 */
export default function AuthorNewSubmission({ mode = 'create' }) {
  const editing = mode === 'edit'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(editing)
  const [manuscript, setManuscript] = useState(null)

  useEffect(() => {
    if (!editing) {
      // /author/new always represents a fresh workflow. Clear only the active
      // manuscript pointer; existing manuscripts remain in the author's account.
      clearAuthorSession()
      return
    }
    let cancelled = false
    async function load() {
      try {
        const payload = await authorApi(currentManuscriptPath('/'))
        if (!cancelled) setManuscript(payload.manuscript)
      } catch (err) {
        if (!cancelled) setError(friendlyAuthorError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [editing])

  const locked = editing && manuscript && manuscript.editable === false

  async function submit(e) {
    e.preventDefault()
    if (locked) return
    setBusy(true)
    setError('')

    try {
      const payload = buildPayload(e.currentTarget)
      if (editing) {
        const updated = await authorApi(currentManuscriptPath('/update/'), { method: 'POST', body: payload })
        saveAuthorSession({ manuscriptTitle: updated.manuscript?.title || '' })
      } else {
        await createAuthorManuscript(payload)
      }
      await authorApi(currentManuscriptPath('/readiness/run/'), { method: 'POST' })
      go('/author/readiness')
    } catch (err) {
      setError(friendlyAuthorError(err))
      setBusy(false)
    }
  }

  const m = manuscript || {}
  const keywords = Array.isArray(m.keywords) ? m.keywords.join(', ') : (m.keywords || '')
  const fileLabel = [m.manuscript_filename, formatBytes(m.manuscript_bytes)].filter(Boolean).join(' · ')

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / {editing ? 'Manuscript' : 'New submission'}</div>
      <AuthorFlowNav active="details" />
      <AuthorPrototypeNotice />

      <div className="author-page-heading">
        <p className="kicker">{editing ? 'Your manuscript' : 'New submission'}</p>
        <h1 className="publication-title">{editing ? 'Review or edit your manuscript.' : 'Tell us about your manuscript.'}</h1>
        <p className="publication-lede">
          {editing
            ? 'Saving changes re-runs the readiness check and venue matching. Any venue assessment is prepared again when you continue.'
            : 'Upload once. The manuscript record is reused for readiness checks, venue comparison, submission, and transfer.'}
        </p>
      </div>

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Could not continue.</b> {error}</div>}

      {locked && <div className="author-prototype-notice" role="note">
        <b>Submitted manuscripts are locked.</b> This manuscript has been sent to a venue, so its details can no longer be changed. Start a new manuscript to prepare a revised version.
      </div>}

      {loading ? <section className="author-panel author-live-state">
        <p className="kicker">Manuscript</p>
        <h2>Loading your manuscript…</h2>
      </section> : (!editing || manuscript) && <div className="author-form-layout" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <form className="author-workflow-form" onSubmit={submit} key={m.id || 'new'}>
          <fieldset disabled={Boolean(locked) || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'contents' }}>
            <section className="author-form-section">
              <div className="author-form-section-head">
                <span>01</span>
                <div><h2>Manuscript</h2><p>The core file and information used for readiness and matching.</p></div>
              </div>
              <div className="row">
                <label htmlFor="author-title">Manuscript title <span className="req">*</span></label>
                <input id="author-title" name="title" type="text" placeholder="Enter the manuscript title" required defaultValue={m.title || ''} />
              </div>
              <div className="two">
                <div className="row">
                  <label htmlFor="author-type">Manuscript type <span className="req">*</span></label>
                  <select id="author-type" name="manuscriptType" required defaultValue={m.manuscript_type || ''}>
                    <option value="" disabled>Select a type…</option>
                    {MANUSCRIPT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="row">
                  <label htmlFor="author-file">
                    {editing ? 'Replace manuscript file' : 'Manuscript file'} {!editing && <span className="req">*</span>}
                  </label>
                  <input id="author-file" name="manuscript" type="file" accept=".docx,.pdf,.md,.zip" required={!editing} />
                  {editing && fileLabel && <p className="author-muted-copy" style={{ margin: '6px 0 0', fontSize: 13 }}>
                    Current file: <b>{fileLabel}</b>. Leave empty to keep it.
                  </p>}
                </div>
              </div>
              <div className="row">
                <label htmlFor="author-abstract">Abstract or short summary</label>
                <textarea id="author-abstract" name="abstract" placeholder="Paste the abstract, or give a short summary if the manuscript has no formal abstract." defaultValue={m.abstract || ''} />
              </div>
              <div className="row">
                <label htmlFor="author-keywords">Keywords</label>
                <input id="author-keywords" name="keywords" type="text" placeholder="e.g. AI agents, manufacturing, operations" defaultValue={keywords} />
              </div>
            </section>

            <section className="author-form-section">
              <div className="author-form-section-head">
                <span>02</span>
                <div><h2>Authors and disclosure</h2><p>These details stay with the reusable manuscript record.</p></div>
              </div>
              <div className="two">
                <div className="row">
                  <label htmlFor="author-name">Primary author <span className="req">*</span></label>
                  <input id="author-name" name="author" type="text" required defaultValue={m.author_name || ''} />
                </div>
                <div className="row">
                  <label htmlFor="author-email">Primary author email <span className="req">*</span></label>
                  <input id="author-email" name="email" type="email" required defaultValue={m.author_email || ''} />
                </div>
              </div>
              <div className="row">
                <label htmlFor="author-coauthors">Co-authors</label>
                <input id="author-coauthors" name="coauthors" type="text" placeholder="Separate names with semicolons" defaultValue={m.coauthors || ''} />
              </div>
              <div className="row">
                <label htmlFor="author-disclosure">How was AI used in preparing this work? <span className="req">*</span></label>
                <textarea id="author-disclosure" name="disclosure" required placeholder="Describe drafting, editing, research, figure generation, coding, or other AI assistance." defaultValue={m.disclosure || ''} />
              </div>
              <div className="row">
                <label htmlFor="author-notes">Notes for the submission workspace</label>
                <textarea id="author-notes" name="notes" placeholder="Optional context you want to keep with this manuscript." defaultValue={m.notes || ''} />
              </div>
              {!locked && <label className="author-attestation">
                <input type="checkbox" required />
                <span>I confirm the information above is accurate and may be used to prepare venue-specific submission materials.</span>
              </label>}
            </section>
          </fieldset>

          <div className="author-form-actions">
            <button className="author-secondary-button" type="button" onClick={() => go('/author')} disabled={busy}>Cancel</button>
            {editing && <button className="author-secondary-button" type="button" onClick={() => go('/author/readiness')} disabled={busy}>
              {locked ? 'Continue to readiness' : 'Continue without changes'}
            </button>}
            {!locked && <button className="copper-button" type="submit" disabled={busy}>
              {busy
                ? (editing ? 'Saving and re-checking…' : 'Uploading and checking…')
                : (editing ? 'Save changes and re-check' : 'Run readiness check')}
            </button>}
          </div>
        </form>
      </div>}
    </div>
  </PublicationShell>
}
