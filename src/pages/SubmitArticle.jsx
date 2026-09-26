import React, { useState } from 'react'
import { api, pollPublicSubmission } from '../api.js'
import { PublicationShell } from '../components/SiteChrome.jsx'

export default function SubmitArticle() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [success, setSuccess] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [timeoutMsg, setTimeoutMsg] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setResult(null); setSuccess(false); setProcessing(false); setTimeoutMsg(false)
    const formElement = e.currentTarget
    const form = new FormData(formElement); form.set('type', 'article')
    try { 
      const response = await api('/api/submissions/', { method: 'POST', body: form })
      if (response.job_id && response.submission_id) {
        setProcessing(true)
        try {
          const finalStatus = await pollPublicSubmission(response.submission_id)
          setResult(finalStatus)
          setSuccess(true)
          setTimeout(() => {
            setSuccess(false)
            formElement.reset()
          }, 3000)
        } catch (err) {
          if (err.message === 'timeout') {
            setTimeoutMsg(true)
            setSuccess(true)
            setTimeout(() => {
              setSuccess(false)
              setTimeoutMsg(false)
              formElement.reset()
            }, 3000)
          } else {
            setError(err.message)
          }
        } finally {
          setProcessing(false)
        }
      } else {
        setResult(response)
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          formElement.reset()
        }, 3000)
      }
    }
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
        <div className="row"><label htmlFor="manuscript">Article file <span className="req">*</span></label><div className="hint">Word (.docx), PDF (.pdf), Markdown (.md), or a ZIP archive (.zip) containing your article, 1,500 to 3,000 words.</div><input id="manuscript" name="manuscript" type="file" accept=".docx,.pdf,.md,.zip" required /></div>
        <div className="row"><label htmlFor="disclosure">How did you use AI in writing this article? <span className="req">*</span></label><div className="hint">Be specific — drafting, editing, research, and so on.</div><textarea id="disclosure" name="disclosure" required /></div>
        <div className="row"><label htmlFor="notes">Notes to the editor</label><textarea id="notes" name="notes" className="short-textarea" /></div>
        <div className="row check"><input id="attest-ui" type="checkbox" required /><label htmlFor="attest-ui">This article is human-authored with AI assistance. It is not AI-authored. <span className="req">*</span></label></div>
        <button className="copper-button" type="submit" disabled={busy || processing}>{busy ? 'Uploading article…' : (processing ? 'Reviewing article…' : 'Submit article')}</button>
        {success && !processing && !timeoutMsg && <p className="submit-status" style={{color: 'green'}}>The article submitted successfully</p>}
        {processing && <p className="submit-status">Keep this page open while the first-gate review runs.</p>}
        {timeoutMsg && <p className="submit-status">We will email you when it finishes.</p>}
        {error && <p className="form-error">{error}</p>}
        {/* Note: SubmitArticle currently does not render ReviewResult, but we follow the exact same state updates just in case */}
      </form>
    </div>
  </PublicationShell>
}
