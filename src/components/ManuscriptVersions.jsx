import React, { useEffect, useState } from 'react'
import { apiBlob } from '../api.js'
import { authorApi, friendlyAuthorError, getAuthorSession } from '../authorApi.js'

function shortDate(value) {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return String(value) }
}

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

async function downloadVersion(manuscriptId, version) {
  const session = getAuthorSession()
  const headers = session.accessToken ? { 'X-Manuscript-Token': session.accessToken } : {}
  const { blob } = await apiBlob(`/api/author/manuscripts/${manuscriptId}/versions/${version.number}/file/`, { headers })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = version.filename || `manuscript-v${version.number}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* Version history and "upload a revised version" (instruction 2.4).
   A new version never changes an earlier one: what a venue received stays as it was. */
export default function ManuscriptVersions({ manuscript, submissions = [], onUploaded }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [revisedAfter, setRevisedAfter] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  async function load() {
    try {
      setData(await authorApi(`/api/author/manuscripts/${manuscript.id}/versions/`))
    } catch (err) {
      setError(friendlyAuthorError(err))
    }
  }

  useEffect(() => { load() }, [manuscript.id])

  const decided = (data?.versions || []).flatMap(v => v.submissions)
    .filter(s => ['rejected', 'revision_requested', 'withdrawn'].includes(s.status))
  const options = submissions.length ? submissions : decided

  async function upload(event) {
    event.preventDefault()
    setError('')
    setDone('')
    if (!file) { setError('Choose the revised file.'); return }
    if (note.trim().length < 3) { setError('Say briefly what changed in this version.'); return }
    const form = new FormData()
    form.append('manuscript', file)
    form.append('change_note', note.trim())
    if (revisedAfter) form.append('revised_after', revisedAfter)
    setBusy(true)
    try {
      const payload = await authorApi(`/api/author/manuscripts/${manuscript.id}/versions/`, { method: 'POST', body: form })
      setDone(`Version ${payload.version.number} saved. ${payload.next_step}`)
      setOpen(false)
      setFile(null)
      setNote('')
      setRevisedAfter('')
      await load()
      if (onUploaded) onUploaded(payload)
    } catch (err) {
      setError(friendlyAuthorError(err))
    } finally {
      setBusy(false)
    }
  }

  const canAdd = manuscript.can_add_version !== false && !manuscript.content_purged_at

  return <section className="md2-card mv-card">
    <div className="md2-sec-head">
      <div><p className="kicker">Versions</p><h2>Version history</h2></div>
      {canAdd && <button type="button" className="md2-btn" onClick={() => { setOpen(v => !v); setError(''); setDone('') }}>
        {open ? 'Cancel' : 'Upload revised version'}
      </button>}
    </div>
    <div className="md2-sec-body">
      {done && <div className="mv-done" role="status">{done}</div>}
      {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}</div>}

      {open && <form className="mv-form" onSubmit={upload}>
        <p className="mv-help">The current version stays exactly as it is, together with anything already sent to a venue.
          The new version becomes the one you work on; run the readiness check and venue matching again for it.</p>
        <label>Revised file
          <input type="file" accept=".docx,.pdf,.md,.zip" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <label>What changed
          <textarea rows={3} maxLength={5000} value={note} onChange={e => setNote(e.target.value)}
            placeholder="For example: cut 500 words, added a limitations section, answered reviewer 2." />
        </label>
        {options.length > 0 && <label>Responding to a decision (optional)
          <select value={revisedAfter} onChange={e => setRevisedAfter(e.target.value)}>
            <option value="">Not responding to a specific decision</option>
            {options.map(s => <option key={s.id} value={s.id}>{s.venue?.name || s.venue} · {pretty(s.status)}</option>)}
          </select>
        </label>}
        <div><button type="submit" className="md2-btn primary" disabled={busy}>{busy ? 'Uploading…' : 'Save as new version'}</button></div>
      </form>}

      {!data ? <p className="md2-empty">Loading versions…</p> : <ol className="mv-list">
        {data.versions.map(version => <li key={version.id} className={version.is_current ? 'current' : ''}>
          <div className="mv-num">v{version.number}</div>
          <div className="mv-body">
            <div className="mv-line">
              <b>{version.is_current ? 'Current version' : `Version ${version.number}`}</b>
              <span>{shortDate(version.created_at)}</span>
              {version.content_purged
                ? <span className="mv-muted">File removed under the retention policy</span>
                : <button type="button" className="md2-link" onClick={() => downloadVersion(manuscript.id, version).catch(err => setError(friendlyAuthorError(err)))}>
                  Download {version.filename}
                </button>}
            </div>
            <p className="mv-note">{version.change_note || (version.source === 'migration' ? 'Original upload.' : 'First upload.')}</p>
            {version.submissions.length > 0 && <p className="mv-subs">Sent to: {version.submissions.map(s => `${s.venue} (${pretty(s.status)})`).join(', ')}</p>}
          </div>
        </li>)}
      </ol>}
    </div>
  </section>
}
