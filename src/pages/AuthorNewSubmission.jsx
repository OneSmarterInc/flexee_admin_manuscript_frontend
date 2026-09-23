import React, { useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice } from '../components/AuthorFlow.jsx'
import { authorApi, createAuthorManuscript, currentManuscriptPath, friendlyAuthorError } from '../authorApi.js'

export default function AuthorNewSubmission() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      const raw = new FormData(e.currentTarget)
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
      if (file) payload.set('manuscript', file)

      await createAuthorManuscript(payload)
      await authorApi(currentManuscriptPath('/readiness/run/'), { method: 'POST' })
      go('/author/readiness')
    } catch (err) {
      setError(friendlyAuthorError(err))
      setBusy(false)
    }
  }

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / New submission</div>
      <AuthorFlowNav active="details" />
      <AuthorPrototypeNotice />

      <div className="author-page-heading">
        <p className="kicker">New submission</p>
        <h1 className="publication-title">Tell us about your manuscript.</h1>
        <p className="publication-lede">Upload once. The manuscript record is reused for readiness checks, venue comparison, submission, and transfer.</p>
      </div>

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Could not continue.</b> {error}</div>}

      <div className="author-form-layout">
        <form className="author-workflow-form" onSubmit={submit}>
          <section className="author-form-section">
            <div className="author-form-section-head">
              <span>01</span>
              <div><h2>Manuscript</h2><p>The core file and information used for readiness and matching.</p></div>
            </div>
            <div className="row">
              <label htmlFor="author-title">Manuscript title <span className="req">*</span></label>
              <input id="author-title" name="title" type="text" placeholder="Enter the manuscript title" required />
            </div>
            <div className="two">
              <div className="row">
                <label htmlFor="author-type">Manuscript type <span className="req">*</span></label>
                <select id="author-type" name="manuscriptType" required defaultValue="">
                  <option value="" disabled>Select a type…</option>
                  <option value="research_article">Research article</option>
                  <option value="practitioner_article">Practitioner article</option>
                  <option value="review_article">Review article</option>
                  <option value="case_study">Case study</option>
                  <option value="conference_paper">Conference paper</option>
                  <option value="book">Book manuscript</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="row">
                <label htmlFor="author-file">Manuscript file <span className="req">*</span></label>
                <input id="author-file" name="manuscript" type="file" accept=".docx,.pdf,.md,.zip" required />
              </div>
            </div>
            <div className="row">
              <label htmlFor="author-abstract">Abstract or short summary</label>
              <textarea id="author-abstract" name="abstract" placeholder="Paste the abstract, or give a short summary if the manuscript has no formal abstract." />
            </div>
            <div className="row">
              <label htmlFor="author-keywords">Keywords</label>
              <input id="author-keywords" name="keywords" type="text" placeholder="e.g. AI agents, manufacturing, operations" />
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
                <input id="author-name" name="author" type="text" required />
              </div>
              <div className="row">
                <label htmlFor="author-email">Primary author email <span className="req">*</span></label>
                <input id="author-email" name="email" type="email" required />
              </div>
            </div>
            <div className="row">
              <label htmlFor="author-coauthors">Co-authors</label>
              <input id="author-coauthors" name="coauthors" type="text" placeholder="Separate names with semicolons" />
            </div>
            <div className="row">
              <label htmlFor="author-disclosure">How was AI used in preparing this work? <span className="req">*</span></label>
              <textarea id="author-disclosure" name="disclosure" required placeholder="Describe drafting, editing, research, figure generation, coding, or other AI assistance." />
            </div>
            <div className="row">
              <label htmlFor="author-notes">Notes for the submission workspace</label>
              <textarea id="author-notes" name="notes" placeholder="Optional context you want to keep with this manuscript." />
            </div>
            <label className="author-attestation">
              <input type="checkbox" required />
              <span>I confirm the information above is accurate and may be used to prepare venue-specific submission materials.</span>
            </label>
          </section>

          <div className="author-form-actions">
            <button className="author-secondary-button" type="button" onClick={() => go('/author')}>Cancel</button>
            <button className="copper-button" type="submit" disabled={busy}>{busy ? 'Uploading and checking…' : 'Run readiness check'}</button>
          </div>
        </form>

        <aside className="author-form-aside">
          <div className="author-panel author-guide-card">
            <p className="kicker">Secure manuscript session</p>
            <h2>Upload once.</h2>
            <p className="author-muted-copy">After upload, this browser receives a manuscript access token. The backend—not the URL alone—controls access to the manuscript and its venue submissions.</p>
          </div>
          <div className="author-mini-note">
            <b>Accepted files</b>
            <span>PDF, DOCX, Markdown, or ZIP</span>
          </div>
        </aside>
      </div>
    </div>
  </PublicationShell>
}
