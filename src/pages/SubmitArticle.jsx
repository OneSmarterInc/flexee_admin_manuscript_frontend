import React, { useState } from 'react'
import { api } from '../api.js'
import { PublicationShell } from '../components/SiteChrome.jsx'

export default function SubmitArticle() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setResult(null)
    const form = new FormData(e.currentTarget); form.set('type', 'article')
    try { setResult(await api('/api/submissions/', { method: 'POST', body: form })) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <PublicationShell>
    <div className="wrap">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / <a href="https://www.flexee.org/journal.php">Field Notes Journal</a> / Submit</div>
      <h1 className="publication-title">Submit to Field Notes Journal.</h1>
      <p className="publication-lede">Practitioner accounts of how a business actually used AI — including the parts that didn&apos;t work.</p>
      <div className="intro-copy">
        <p>We publish first-hand articles of 1,500 to 3,000 words from practitioners and faculty on how a business put AI to work. The most useful pieces are honest about the limits, so an account of what fell short carries as much weight here as the wins. Articles are published online on a rolling basis and are free to read, and co-authorship is encouraged.</p>
        <p>A strong Field Notes article moves through four things:</p>
        <ol className="parts"><li>the business and the problem it faced,</li><li>what was tried,</li><li>what happened,</li><li>and what didn&apos;t work.</li></ol>
        <p>We send a first review within 15 days. AI assistance in writing is welcome; an AI-authored article is not, so the disclosure and attestation below matter. You can also submit by email to <a href="mailto:editor@flexee.org">editor@flexee.org</a>.</p>
      </div>
      <form className="original-form" onSubmit={submit}>
        <input type="hidden" name="attestation" value="human-authored-with-ai-assistance" />
        <div className="row two"><div><label htmlFor="author">Your name <span className="req">*</span></label><input id="author" name="author" required /></div><div><label htmlFor="email">Email</label><div className="hint">Optional when the backend has DEFAULT_REVIEW_EMAIL configured.</div><input id="email" name="email" type="email" /></div></div>
        <div className="row"><label htmlFor="coauthors">Co-authors</label><div className="hint">Names of any co-authors, if this is a collaboration.</div><input id="coauthors" name="coauthors" /></div>
        <div className="row"><label htmlFor="title">Article title <span className="req">*</span></label><input id="title" name="title" required /></div>
        <div className="row"><label htmlFor="manuscript">Article file <span className="req">*</span></label><div className="hint">Word (.docx), PDF (.pdf), or Markdown (.md), 1,500 to 3,000 words.</div><input id="manuscript" name="manuscript" type="file" accept=".docx,.pdf,.md" required /></div>
        <div className="row"><label htmlFor="disclosure">How did you use AI in writing this article? <span className="req">*</span></label><div className="hint">Be specific — drafting, editing, research, and so on.</div><textarea id="disclosure" name="disclosure" required /></div>
        <div className="row"><label htmlFor="notes">Notes to the editor</label><textarea id="notes" name="notes" className="short-textarea" /></div>
        <div className="row check"><input id="attest-ui" type="checkbox" required /><label htmlFor="attest-ui">This article is human-authored with AI assistance. It is not AI-authored. <span className="req">*</span></label></div>
        <button className="copper-button" type="submit" disabled={busy}>{busy ? 'Reviewing article…' : 'Submit article'}</button>
        {busy && <p className="submit-status">Keep this page open while the first-gate review runs.</p>}
        {error && <p className="form-error">{error}</p>}
        {result && <div className="review-result"><p className="kicker">Review result</p><h2>{result.decision === 'PASS_TO_HUMAN' ? 'Pass to human review' : result.decision === 'REFER_TO_HUMAN_WITH_FLAGS' ? 'Refer to human with flags' : 'Return to author'}</h2><div className="result-meta"><span>Submission {result.id}</span><span>{result.total_words?.toLocaleString()} words</span></div><pre>{result.author_letter}</pre>{result.email_warning && <p className="form-error">Review saved, but email delivery reported: {result.email_warning}</p>}</div>}
      </form>
    </div>
  </PublicationShell>
}
