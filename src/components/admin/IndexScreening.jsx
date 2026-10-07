import React, { useEffect, useState } from 'react'
import { api } from '../../api.js'

// Exclusion review for one index record (build plan step 3).
// Screening only flags; a person decides, with criteria and evidence. Every decision is stored and reversible.

export const SCREENING_LABEL = {
  flagged: ['Needs review', 'border-amber-200 bg-amber-50 text-amber-800'],
  excluded: ['Excluded', 'border-red-200 bg-red-50 text-red-700'],
  kept: ['Reviewed · kept', 'border-green-200 bg-green-50 text-green-700'],
}

export function ScreeningPill({ screening, excluded }) {
  const status = excluded ? 'excluded' : screening?.status
  if (screening?.rereview_suggested) {
    return <span className="inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11.5px] font-extrabold text-amber-800"
      title="Excluded, but the criteria behind the exclusion are no longer detected">Excluded · re-review suggested</span>
  }
  const entry = SCREENING_LABEL[status]
  if (!entry) return null
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-extrabold ${entry[1]}`}
    title={(screening?.concerns || []).join(' · ')}>{entry[0]}</span>
}

function when(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Concern({ flag }) {
  const strong = flag.weight >= 3
  return <li className={`rounded-xl border px-3 py-2 ${strong ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
    <div className="flex flex-wrap items-center gap-2">
      <b className="text-[13.5px]">{flag.label}</b>
      <span className="rounded-full bg-white px-1.5 text-[11px] font-extrabold text-muted" title="Screening points">{flag.weight} pt{flag.weight === 1 ? '' : 's'}</span>
      <span className="text-[11px] font-extrabold uppercase tracking-[.06em] text-muted">{flag.source === 'page' ? 'From the journal\'s own page' : flag.source === 'blocklist' ? 'Blocklist' : 'Catalogue'}</span>
    </div>
    {flag.detail && <div className="mt-0.5 text-[13px] text-ink/80">{flag.detail}</div>}
    {flag.quote && <blockquote className="mt-1 border-l-2 border-red-300 pl-2 text-[12.5px] italic text-ink/80">{flag.quote}</blockquote>}
    {flag.evidence_url && <a className="mt-1 inline-block break-all text-[12.5px] font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2" href={flag.evidence_url} target="_blank" rel="noopener noreferrer">{flag.evidence_url}</a>}
  </li>
}

export default function ScreeningSection({ item, criteria = {}, onDecided, onError }) {
  const flags = item.screening_flags || []
  const concerns = flags.filter(f => f.kind === 'negative')
  const positives = flags.filter(f => f.kind === 'positive')
  const [mode, setMode] = useState('')  // '' | 'exclude' | 'keep' | 'restore'
  const [picked, setPicked] = useState([])
  const [evidence, setEvidence] = useState('')
  const [note, setNote] = useState('')
  const [block, setBlock] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMode('')
    setPicked(item.suggested_criteria || [])
    setEvidence((item.suggested_evidence || []).join('\n'))
    setNote('')
    setBlock(false)
  }, [item.id, item.screening?.status, item.excluded])

  async function submit() {
    setBusy(true)
    try {
      const body = { decision: mode, note, criteria: picked, block_publisher: block,
        evidence_urls: evidence.split(/\s+/).map(s => s.trim()).filter(Boolean) }
      const result = await api(`/api/admin/venue-index/${item.id}/decision/`, { method: 'POST', body: JSON.stringify(body) })
      onDecided?.(result.item, mode)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusy(false)
    }
  }

  const status = item.excluded ? 'excluded' : item.screening?.status
  const reason = item.exclusion_reason || {}

  return <section className="mx-6 mt-5 rounded-[20px] border border-line bg-white p-4" aria-labelledby="screening-title">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="text-[12px] font-extrabold uppercase tracking-[.07em] text-flexee-600">Exclusion review</div>
        <h4 id="screening-title" className="serif mt-0.5 text-[24px] leading-none">
          {status === 'excluded' ? 'Excluded from the index' : status === 'flagged' ? 'Needs a decision' : status === 'kept' ? 'Reviewed and kept' : 'No concerns found'}
        </h4>
        <p className="mt-1 max-w-[720px] text-[13px] text-muted">
          Screening only flags. Nothing is excluded until you choose the criteria it fails and the evidence. Authors never see why; an excluded journal simply does not appear.
          {item.screened_at && <> Last screened {when(item.screened_at)}{item.pages_checked_at ? `, pages read ${when(item.pages_checked_at)}` : ', pages not read'}.</>}
        </p>
      </div>
    </div>

    {status === 'excluded' && <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-[13.5px] text-red-900">
      <div><b>Criteria:</b> {(reason.criteria || []).map(c => criteria[c] || c).join('; ') || '—'}</div>
      {(reason.evidence_urls || []).length > 0 && <div className="mt-1 break-all"><b>Evidence:</b> {reason.evidence_urls.map((u, i) => <span key={u}>{i > 0 && ', '}<a className="font-bold underline" href={u} target="_blank" rel="noopener noreferrer">{u}</a></span>)}</div>}
      <div className="mt-1 text-red-800/80">Decided by {reason.decided_by || '—'}{reason.decided_at ? ` on ${when(reason.decided_at)}` : ''}.{reason.note ? ` ${reason.note}` : ''}</div>
      {item.screening?.rereview_suggested && <div className="mt-2 font-extrabold text-amber-800">The problems behind this exclusion are no longer detected. Consider restoring it.</div>}
    </div>}

    <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_.6fr]">
      <div>
        <div className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">Concerns ({concerns.length}){item.screening?.points ? ` · ${item.screening.points} points` : ''}</div>
        {concerns.length ? <ul className="space-y-2">{concerns.map(flag => <Concern key={flag.code} flag={flag} />)}</ul>
          : <div className="rounded-xl border border-line bg-[#fcfaf8] px-3 py-2 text-[13px] text-muted">No concerns from the catalogue{item.pages_checked_at ? ' or the journal\'s pages' : ''}.</div>}
      </div>
      <div>
        <div className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">In its favour</div>
        {positives.length ? <ul className="space-y-1.5">{positives.map(flag => <li key={flag.code} className="rounded-xl border border-green-200 bg-green-50/70 px-3 py-1.5 text-[13px] font-bold text-green-800">
          ✓ {flag.label}{flag.detail ? <span className="block text-[12px] font-medium text-green-900/80">{flag.detail}</span> : null}
        </li>)}</ul> : <div className="text-[13px] text-muted">None recorded.</div>}
      </div>
    </div>

    {!mode && <div className="mt-4 flex flex-wrap gap-2">
      {status !== 'excluded' && <button type="button" onClick={() => setMode('exclude')}
        className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-extrabold text-white shadow-sm hover:bg-red-700">Exclude…</button>}
      {status === 'flagged' && <button type="button" onClick={() => setMode('keep')}
        className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold shadow-sm hover:shadow-card">Keep…</button>}
      {status === 'excluded' && <button type="button" onClick={() => setMode('restore')}
        className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold shadow-sm hover:shadow-card">Restore…</button>}
    </div>}

    {mode && <div className="mt-4 rounded-2xl border border-line bg-[#fcfaf8] p-4">
      <div className="text-[14px] font-extrabold">{mode === 'exclude' ? 'Exclude this journal' : mode === 'keep' ? 'Keep this journal' : 'Restore this journal'}</div>
      {mode === 'exclude' && <>
        <div className="mt-2 text-[12.5px] font-extrabold uppercase tracking-[.06em] text-muted">Criteria it fails (required)</div>
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          {Object.entries(criteria).map(([code, label]) => <label key={code} className="flex items-start gap-2 text-[13.5px]">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#c7662d]" checked={picked.includes(code)}
              onChange={e => setPicked(e.target.checked ? [...picked, code] : picked.filter(c => c !== code))} />
            <span>{label}</span>
          </label>)}
        </div>
        <label className="mt-3 block">
          <span className="text-[12.5px] font-extrabold uppercase tracking-[.06em] text-muted">Evidence links (required, one per line)</span>
          <textarea className="field mt-1 min-h-[70px] text-[13px]" value={evidence} onChange={e => setEvidence(e.target.value)} />
        </label>
        {item.publisher && <label className="mt-2 flex items-center gap-2 text-[13.5px]">
          <input type="checkbox" className="h-4 w-4 accent-[#c7662d]" checked={block} onChange={e => setBlock(e.target.checked)} disabled={item.publisher_blocked} />
          <span>{item.publisher_blocked ? `${item.publisher} is already on the blocklist` : `Also block ${item.publisher} (its other titles go to the review queue)`}</span>
        </label>}
      </>}
      <label className="mt-3 block">
        <span className="text-[12.5px] font-extrabold uppercase tracking-[.06em] text-muted">Note {mode === 'exclude' ? '(internal)' : '(why)'}</span>
        <input className="field mt-1 text-[13px]" value={note} onChange={e => setNote(e.target.value)}
          placeholder={mode === 'keep' ? 'e.g. Society journal; DOIs are registered through JSTOR' : mode === 'restore' ? 'e.g. The acceptance promise was removed from the site' : 'What you checked'} />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || (mode === 'exclude' && (!picked.length || !evidence.trim()))} onClick={submit}
          className={`rounded-xl px-4 py-2 text-[13px] font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'exclude' ? 'bg-red-600 hover:bg-red-700' : 'bg-flexee-500 hover:bg-flexee-600'}`}>
          {busy ? 'Saving…' : mode === 'exclude' ? 'Confirm exclusion' : mode === 'keep' ? 'Confirm keep' : 'Confirm restore'}
        </button>
        <button type="button" onClick={() => setMode('')} className="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-extrabold">Cancel</button>
      </div>
    </div>}

    {(item.decisions || []).length > 0 && <div className="mt-4">
      <div className="mb-1 text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">Decision history</div>
      <ul className="space-y-1 text-[13px]">
        {item.decisions.map((d, i) => <li key={i} className="text-ink/85">
          <b className="capitalize">{d.decision}</b> by {d.decided_by} on {when(d.decided_at)}
          {d.criteria?.length > 0 && <> · {d.criteria.map(c => criteria[c] || c).join('; ')}</>}
          {d.note && <span className="text-muted"> · {d.note}</span>}
        </li>)}
      </ul>
    </div>}
  </section>
}
