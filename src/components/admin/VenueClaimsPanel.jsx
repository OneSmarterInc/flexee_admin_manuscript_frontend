import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../api.js'

// Build plan step 9: editors claim journals; a platform admin approves each claim.
// Approval gives the editor ownership of that one journal. It shows as editor-confirmed only once
// the editor saves their own rules.

const TABS = [
  ['pending_review', 'To review'],
  ['pending_email', 'Email not confirmed'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
]
const TIER = { claimed: 'Editor-confirmed', verified_index: 'Checked from official pages', listed: 'Listed only' }

function when(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Check({ ok, children }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-extrabold ${ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
    {ok ? '✓' : '!'} {children}
  </span>
}

function ClaimCard({ claim, onDone }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const open = claim.status === 'pending_review' || claim.status === 'pending_email'
  const journalHref = claim.journal.key ? `/journals/${claim.journal.kind === 'venue' ? 'v' : 'i'}/${claim.journal.key}` : ''

  async function decide(action) {
    setBusy(action)
    setError('')
    try {
      const result = await api(`/api/admin/claims/${claim.id}/${action}/`, { method: 'POST', body: JSON.stringify({ note }) })
      onDone(action === 'approve'
        ? `Approved. ${claim.claimant.email} now owns ${claim.journal.name}${result.new_account ? ' and was sent a link to set a password' : ''}.`
        : `Rejected. ${claim.claimant.name} was told why.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return <article className="premium-card rounded-[20px] p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">{TIER[claim.journal.tier] || claim.journal.tier} · claimed {when(claim.created_at)}</div>
        <h3 className="serif mt-0.5 text-[24px] leading-tight">
          {journalHref ? <a href={journalHref} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-line underline-offset-4">{claim.journal.name}</a> : claim.journal.name}
        </h3>
        {claim.journal.url && <a className="break-all text-[13px] font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2" href={claim.journal.url} target="_blank" rel="noopener noreferrer">{claim.journal.url}</a>}
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        <Check ok={Boolean(claim.checks.email_verified_at)}>{claim.checks.email_verified_at ? 'Email confirmed' : 'Email not confirmed'}</Check>
        <Check ok={claim.checks.domain_matches}>{claim.checks.domain_matches ? `Email on the journal's domain` : `Email not on the journal's domain (${claim.checks.email_domain})`}</Check>
        {claim.checks.other_open_claims > 0 && <Check ok={false}>{claim.checks.other_open_claims} other open claim{claim.checks.other_open_claims === 1 ? '' : 's'}</Check>}
      </div>
    </div>

    <div className="mt-3 grid gap-1 rounded-xl border border-line bg-[#fcfaf8] px-3 py-2 text-[13.5px] sm:grid-cols-[140px_1fr]">
      <span className="font-extrabold text-muted">Claimant</span><span><b>{claim.claimant.name}</b> · {claim.claimant.role_title} · {claim.claimant.email}</span>
      <span className="font-extrabold text-muted">Evidence</span>
      <span>{claim.claimant.evidence_url ? <a className="break-all font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2" href={claim.claimant.evidence_url} target="_blank" rel="noopener noreferrer">{claim.claimant.evidence_url}</a> : <span className="text-muted">None given</span>}</span>
      {claim.claimant.message && <><span className="font-extrabold text-muted">Message</span><span className="whitespace-pre-line">{claim.claimant.message}</span></>}
      {!open && <><span className="font-extrabold text-muted">Decision</span><span>{claim.status} by {claim.decision.by} on {when(claim.decision.at)}{claim.decision.note ? ` · ${claim.decision.note}` : ''}</span></>}
    </div>

    {open && <div className="mt-3">
      <p className="text-[12.5px] text-muted">Approve only if the evidence page is on the journal&rsquo;s own site and lists this person, or the email is on the journal&rsquo;s domain. Approval gives them this journal only.</p>
      <textarea className="field mt-2 min-h-[64px] w-full rounded-xl border border-line px-3 py-2 text-[14px]" value={note} onChange={e => setNote(e.target.value)}
        placeholder="Note (sent to the claimant): what you checked, or why it was not approved" />
      {error && <div className="admin-error venue-admin-message mt-2">{error}</div>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy) || claim.status !== 'pending_review'} onClick={() => decide('approve')}
          title={claim.status !== 'pending_review' ? 'The claimant must confirm their email first' : ''}
          className="rounded-xl bg-flexee-500 px-4 py-2 text-[13px] font-extrabold text-white hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'approve' ? 'Approving…' : 'Approve claim'}</button>
        <button type="button" disabled={Boolean(busy)} onClick={() => decide('reject')}
          className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold hover:shadow-card disabled:opacity-50">{busy === 'reject' ? 'Rejecting…' : 'Reject'}</button>
      </div>
    </div>}
  </article>
}

export default function VenueClaimsPanel() {
  const [status, setStatus] = useState('pending_review')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/admin/claims/?status=${status}`))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [status])
  useEffect(() => { load() }, [load])

  return <div>
    <p className="text-[12px] font-extrabold uppercase tracking-[.1em] text-flexee-600">Venue claims</p>
    <h2 className="serif mt-1 text-[38px] leading-none">Editors claiming journals</h2>
    <p className="mt-2 max-w-[820px] text-[14.5px] text-muted">An editor finds their journal in the index and asks to manage it. They confirm their email first; you decide.
      Their journal shows as &ldquo;Editor-confirmed&rdquo; only after they save its rules themselves.</p>

    <div className="my-4 flex flex-wrap gap-2">
      {TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setStatus(key)}
        className={`metric-chip inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-1.5 ${status === key ? 'active' : ''}`}>
        <span className="serif text-[18px] leading-none">{data?.counts?.[key] ?? 0}</span>
        <span className="text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">{label}</span>
      </button>)}
    </div>
    {toast && <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[13.5px] font-bold text-green-800">{toast}</div>}
    {error && <div className="admin-error venue-admin-message mb-3">{error}</div>}
    <div className="space-y-3">
      {data?.claims?.length ? data.claims.map(c => <ClaimCard key={c.id} claim={c} onDone={message => { setToast(message); load() }} />)
        : data && <div className="premium-card rounded-[20px] p-8 text-center text-[14.5px] text-muted">No claims here.</div>}
    </div>
  </div>
}
