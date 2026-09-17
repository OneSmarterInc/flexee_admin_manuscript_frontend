import React, { useState } from 'react'
import { api } from '../api.js'
import { PublicationShell } from '../components/SiteChrome.jsx'

const sims = {
  'Shipping simulations': [
    'Flexee Supply Chain', 'Flexee Supply Chain Executive', 'Flexee Data Analytics',
    'Flexee Healthcare', 'Flexee Financial Accounting', 'Flexee ERP',
    'Flexee Defense Acquisitions Specialist', 'Flexee MIS',
  ],
  'In development': [
    'Flexee Systems Analysis and Design', 'Flexee Management Accounting', 'Flexee Corporate Strategy',
    'Flexee Marketing Strategy', 'Flexee Managerial Economics', 'Flexee Project Management',
    'Flexee Business Process Management', 'Flexee Cybersecurity', 'Flexee Nursing Leadership',
    'Flexee AI Decision Economics',
  ],
}

function ReviewResult({ data }) {
  if (!data) return null
  return <div className="review-result">
    <p className="kicker">Review result</p>
    <h2>{data.decision === 'PASS_TO_HUMAN' ? 'Pass to human review' : data.decision === 'REFER_TO_HUMAN_WITH_FLAGS' ? 'Refer to human with flags' : 'Return to author'}</h2>
    <div className="result-meta"><span>Submission {data.id}</span><span>{data.total_words?.toLocaleString()} words</span></div>
    <pre>{data.author_letter}</pre>
    {data.email_warning && <p className="form-error">Review saved, but email delivery reported: {data.email_warning}</p>}
  </div>
}

export default function SubmitBook() {
  const [sim, setSim] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [success, setSuccess] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setResult(null); setSuccess(false)
    const form = new FormData(e.currentTarget)
    form.set('type', 'book')
    try { 
      setResult(await api('/api/submissions/', { method: 'POST', body: form })) 
      setSuccess(true)
      e.target.reset()
      setSim('')
    }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <PublicationShell>
    <div className="wrap">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / <a href="https://www.flexee.org/books.php">Five Zero Books</a> / Submit</div>
      <h1 className="publication-title">Submit a Five Zero Book.</h1>
      <p className="publication-lede">A Five Zero Book is a companion book paired with one Flexee simulation, written in the Five Zero format.</p>
      <div className="intro-copy">
        <p>Tell us which simulation your book pairs with, share the manuscript, and describe how you used AI in the writing. We read every submission and send a first review within 15 days. Submissions are rolling, so there&apos;s no cutoff deadline, and anything that isn&apos;t ready yet comes back to you with specific notes so you can revise and resubmit.</p>
        <p>AI assistance is welcome and expected. What we don&apos;t accept is an AI-authored manuscript, so the disclosure and the attestation below matter. If you&apos;d rather send your manuscript by email, write to <a href="mailto:editor@flexee.org">editor@flexee.org</a>.</p>
      </div>

      <form className="original-form" onSubmit={submit}>
        <input type="hidden" name="attestation" value="human-authored-with-ai-assistance" />
        <div className="row two">
          <div><label htmlFor="author">Your name <span className="req">*</span></label><input id="author" name="author" type="text" required /></div>
          <div><label htmlFor="email">Email</label><div className="hint">Optional when the backend has DEFAULT_REVIEW_EMAIL configured.</div><input id="email" name="email" type="email" /></div>
        </div>
        <div className="row"><label htmlFor="coauthors">Co-authors</label><div className="hint">Names of any co-authors, if this is a collaboration.</div><input id="coauthors" name="coauthors" type="text" /></div>
        <div className="row"><label htmlFor="title">Book title <span className="req">*</span></label><input id="title" name="title" type="text" required /></div>
        <div className="row">
          <label htmlFor="sim">Simulation it pairs with <span className="req">*</span></label>
          <div className="hint">A Five Zero Book is a companion to one specific simulation.</div>
          <select id="sim" name="sim" required value={sim} onChange={e => setSim(e.target.value)}>
            <option value="" disabled>Choose a simulation…</option>
            {Object.entries(sims).map(([group, items]) => <optgroup key={group} label={group}>{items.map(x => <option key={x}>{x}</option>)}</optgroup>)}
            <option value="__other">Other (enter below)</option>
          </select>
        </div>
        {sim === '__other' && <div className="row"><label htmlFor="sim_other">Which simulation? <span className="req">*</span></label><input id="sim_other" name="sim_other" type="text" required /></div>}
        <div className="row"><label htmlFor="manuscript">Manuscript file <span className="req">*</span></label><div className="hint">Word (.docx), PDF (.pdf), or Markdown (.md). Use clear chapter headings and caption figures as “Figure 1”, “Figure 2”, and so on so the structural check can read them.</div><input id="manuscript" name="manuscript" type="file" accept=".docx,.pdf,.md" required /></div>
        <div className="row"><label htmlFor="disclosure">How did you use AI in writing this book? <span className="req">*</span></label><div className="hint">Be specific — drafting, figure generation, editing, research, and so on.</div><textarea id="disclosure" name="disclosure" required /></div>
        <div className="row"><label htmlFor="notes">Notes to the editor</label><textarea id="notes" name="notes" className="short-textarea" /></div>
        <div className="row check"><input id="attest-ui" type="checkbox" required /><label htmlFor="attest-ui">This manuscript is human-authored with AI assistance. It is not AI-authored. <span className="req">*</span></label></div>
        <button className="copper-button" type="submit" disabled={busy}>{busy ? 'Reviewing manuscript…' : 'Submit manuscript'}</button>
        {success && <p className="submit-status" style={{color: 'green'}}>book has been uploded successfully</p>}
        {busy && <p className="submit-status">Keep this page open while the first-gate review runs.</p>}
        {error && <p className="form-error">{error}</p>}
        <ReviewResult data={result} />
      </form>
    </div>
  </PublicationShell>
}
