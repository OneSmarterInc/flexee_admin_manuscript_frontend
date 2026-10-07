import React, { useState } from 'react'
import { api } from '../../api.js'

// Rules read from a journal's own pages (build plan step 4). Reading never publishes:
// an admin checks the quoted rules here and clicks Publish.

export function RulesPill({ rules, published }) {
  if (published) return null
  if (rules?.status === 'ready') {
    return <span className="inline-flex whitespace-nowrap rounded-full border border-flexee-200 bg-flexee-50 px-2 py-0.5 text-[11.5px] font-extrabold text-flexee-700"
      title="Rules read from the official pages; waiting for approval">Rules ready</span>
  }
  if (rules?.status === 'blocked') {
    return <span className="inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11.5px] font-extrabold text-amber-800"
      title={rules.error || ''}>Site blocks reading</span>
  }
  if (rules?.status === 'incomplete' || rules?.status === 'failed') {
    return <span className="inline-flex whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-[11.5px] font-extrabold text-muted"
      title={rules.error || ''}>Rules not found</span>
  }
  return null
}

const STAGE_LABELS = { local: 'Local model', local_retry: 'Local retry', cloud: 'Cloud (Anthropic)' }
const pct = value => `${Math.round((value || 0) * 100)}%`

// Build plan step 6: how often the local model needed help, per field. Under 20% the local model pays
// for itself; above it, that field should move to the cloud.
export function EscalationCard({ stats }) {
  const r = stats.resolved || {}
  return <div className="premium-card mb-3 rounded-[18px] px-4 py-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <span className="text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">Local AI first · last {stats.days} days</span>
        <div className="mt-0.5 text-[14px]">
          <b>{stats.reads}</b> read{stats.reads === 1 ? '' : 's'}: <b>{r.local || 0}</b> on the first try · <b>{r.local_retry || 0}</b> after a local retry ·{' '}
          <b>{r.cloud || 0}</b> after the cloud · <b>{r.unresolved || 0}</b> not resolved
        </div>
      </div>
      <div className="text-[13px] text-muted">
        Escalation rate <b className="text-ink">{pct(stats.escalation_rate)}</b>
        {' · '}{stats.cloud_enabled ? <>cloud: {stats.cloud_calls} call{stats.cloud_calls === 1 ? '' : 's'}, ${Number(stats.cloud_cost_usd || 0).toFixed(2)}</> : 'cloud escalation off'}
      </div>
    </div>
    {stats.fields?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">
      {stats.fields.map(f => <span key={f.field}
        title={f.move_to_cloud ? `The local model missed this in more than ${pct(stats.threshold)} of reads: consider sending this field to the cloud model.` : `Missed by the local model on the first try in ${f.count} reads.`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-bold ${f.move_to_cloud ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-line bg-white text-ink'}`}>
        {f.label} <span className="font-extrabold">{pct(f.rate)}</span>{f.move_to_cloud && <span className="text-[11px] font-extrabold uppercase">above {pct(stats.threshold)}</span>}
      </span>)}
    </div>}
  </div>
}

// Build plan step 7: how fresh is what authors see? Calls not re-confirmed in time are hidden.
export function FreshnessCard({ stats, changes, onChanges }) {
  const age = d => d == null ? '—' : `${d} day${d === 1 ? '' : 's'}`
  return <div className="premium-card mb-3 rounded-[18px] px-4 py-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">Freshness · live journals checked from official pages</span>
      {changes > 0 && <button type="button" onClick={onChanges} className="text-[13px] font-extrabold text-amber-800 underline decoration-amber-300 underline-offset-2">{changes} with changed pages · review</button>}
    </div>
    <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
      <span><b>{stats.live_verified}</b> live · median age <b>{age(stats.median_age_days)}</b> · oldest {age(stats.oldest_age_days)}</span>
      <span title={`Rules of live journals are re-read every ${stats.rules_refresh_days} days`}><b>{stats.rules_refresh_due}</b> due for the {stats.rules_refresh_days}-day re-read</span>
      <span title={`A call is shown only if its deadline is ahead and it was re-confirmed within ${stats.calls_confirm_days} days`}>
        Open calls: <b>{stats.calls_shown}</b> shown · <b className={stats.calls_hidden ? 'text-amber-800' : ''}>{stats.calls_hidden}</b> hidden (expired or unconfirmed)
      </span>
      {stats.calls_failing > 0 && <span className="text-amber-800">{stats.calls_failing} journal{stats.calls_failing === 1 ? '' : 's'} could not be re-checked</span>}
    </div>
  </div>
}

function Calls({ calls }) {
  if (!calls) return null
  return <div className="mt-3 rounded-xl border border-line bg-[#fcfaf8] px-3 py-2 text-[13px]">
    <div className="font-extrabold">Open calls shown to authors: {calls.shown.length}{calls.hidden > 0 && <span className="font-semibold text-amber-800"> · {calls.hidden} hidden (expired or not re-confirmed)</span>}</div>
    {calls.shown.map(c => <div key={c.title + c.deadline} className="mt-0.5">{c.title} · deadline {c.deadline}</div>)}
    <div className="mt-0.5 text-muted">{calls.checked_at ? `Last checked ${when(calls.checked_at)}` : 'Not checked by the weekly job yet'}{calls.error ? ` · ${calls.error}` : ''}</div>
  </div>
}

function Attempts({ attempts }) {
  if (!attempts?.length) return null
  return <div className="mt-3">
    <div className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">How it was read</div>
    <ol className="space-y-1">
      {attempts.map((a, i) => <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase ${a.outcome === 'adequate' ? 'bg-green-50 text-green-800' : a.outcome === 'error' ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-muted'}`}>{a.outcome}</span>
        <b>{STAGE_LABELS[a.stage] || a.stage}</b>{a.model && <span className="text-muted">{a.model}</span>}
        {a.reason && <span className="text-muted">· {a.reason}</span>}
      </li>)}
    </ol>
  </div>
}

function when(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Row({ label, children }) {
  return <div className="grid gap-1 border-b border-line py-2 last:border-0 sm:grid-cols-[180px_1fr]">
    <div className="text-[12.5px] font-extrabold text-muted">{label}</div>
    <div className="text-[13.5px]">{children}</div>
  </div>
}

export default function RulesSection({ item, onPublished, onChangesApplied, onError }) {
  const [busy, setBusy] = useState(false)
  const status = item.rules?.status || 'not_read'
  const read = item.rules_read
  if (status === 'not_read' && !read) return null

  const published = Boolean(item.venue)
  const blockedReason = item.excluded ? 'Excluded journals cannot be published. Restore it first.'
    : item.screening?.status === 'flagged' ? 'Decide the exclusion review above first (Keep or Exclude).' : ''

  async function applyChanges() {
    setBusy(true)
    try {
      const result = await api(`/api/admin/venue-index/${item.id}/apply-changes/`, { method: 'POST', body: '{}' })
      ;(onChangesApplied || onPublished)?.(result.item)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    setBusy(true)
    try {
      const result = await api(`/api/admin/venue-index/${item.id}/publish/`, { method: 'POST', body: '{}' })
      onPublished?.(result.item)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="mx-6 mt-5 rounded-[20px] border border-line bg-white p-4" aria-labelledby="rules-title">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="text-[12px] font-extrabold uppercase tracking-[.07em] text-flexee-600">Rules from the official pages</div>
        <h4 id="rules-title" className="serif mt-0.5 text-[24px] leading-none">
          {published ? 'Published for authors' : status === 'ready' ? 'Ready for your approval' : status === 'failed' ? 'Pages could not be read'
            : status === 'blocked' ? 'Site blocks automated reading' : 'Rules not found'}
        </h4>
        <p className="mt-1 max-w-[720px] text-[13px] text-muted">
          Read by the AI{item.rules?.read_at ? ` on ${when(item.rules.read_at)}` : ''}. Only rules backed by a quote on the journal's own page are kept.
          {!published && status === 'ready' && ' Nothing is shown to authors until you publish.'}
        </p>
      </div>
      {read && <span className="inline-flex shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[12px] font-extrabold" title="Computed from the sources, never chosen by the AI">Confidence {read.confidence}</span>}
    </div>

    {status === 'blocked' && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
      {item.rules?.error && <p className="break-words">{item.rules.error}</p>}
      <p className={item.rules?.error ? 'mt-1.5 font-bold' : 'font-bold'}>The publisher does not allow automated reading, and we respect that. Options:</p>
      <ol className="mt-1 list-decimal pl-5">
        <li>Enter the rules by hand in Venue Agents.</li>
        <li>Wait for the editor to claim the venue.</li>
        <li>Leave it as Listed only.</li>
      </ol>
      <p className="mt-1.5 text-amber-800">It is tried again after 90 days.</p>
    </div>}

    {(status === 'incomplete' || status === 'failed') && item.rules?.error && <div className="mt-3 rounded-xl border border-line bg-[#fcfaf8] px-3 py-2 text-[13px] text-muted">
      {item.rules.error} It is tried again after 30 days.
    </div>}

    {read && status === 'ready' && <div className="mt-3">
      <Row label="Scope">{read.aims_scope || <span className="text-muted">Not stated</span>}</Row>
      <Row label="Article types">{read.article_types?.length ? read.article_types.join(', ') : <span className="text-muted">Not stated</span>}</Row>
      <Row label="Limits">{read.limits?.length ? <ul className="list-disc pl-4">{read.limits.map(l => <li key={l}>{l}</li>)}</ul> : <span className="text-muted">None stated</span>}</Row>
      <Row label="Required items">{read.required_items?.length ? read.required_items.join(', ') : <span className="text-muted">None stated</span>}</Row>
      <Row label="Submissions">{read.acceptance_status === 'accepting' ? 'Open' : read.acceptance_status === 'closed' ? 'Closed' : 'Not clear from the pages'}
        {read.submission_url && <> · <a className="font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2" href={read.submission_url} target="_blank" rel="noopener noreferrer">submission page</a></>}</Row>
      {read.evidence?.length > 0 && <div className="mt-3">
        <div className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[.07em] text-muted">Quotes from the pages ({read.evidence.length})</div>
        <ul className="space-y-1.5">
          {read.evidence.map((e, i) => <li key={i} className="rounded-xl border border-line bg-[#fcfaf8] px-3 py-2 text-[13px]">
            <b>{e.claim || e.field}</b>
            {e.quote && <blockquote className="mt-0.5 border-l-2 border-flexee-300 pl-2 italic text-ink/80">“{e.quote}”</blockquote>}
            {e.url && <a className="mt-0.5 inline-block break-all text-[12.5px] font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2" href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a>}
          </li>)}
        </ul>
      </div>}
    </div>}

    {published && item.rules?.changes && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
      <b>The official pages changed since this journal was published.</b> {item.rules.changes}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" onClick={applyChanges} disabled={busy}
          className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-[13px] font-extrabold text-white hover:bg-amber-700 disabled:opacity-50">{busy ? 'Applying…' : 'Apply changes'}</button>
        <span className="text-[12.5px]">Creates a new rules version for the live venue. Until then authors see the earlier rules, with their check date.</span>
      </div>
    </div>}
    {published && <Calls calls={item.calls} />}

    <Attempts attempts={item.rules_attempts} />

    {status === 'ready' && !published && <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={publish} disabled={busy || Boolean(blockedReason)}
        className="shine rounded-xl bg-flexee-500 px-4 py-2 text-[13px] font-extrabold text-white shadow-orange hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? 'Publishing…' : 'Publish for authors'}
      </button>
      <span className="text-[12.5px] text-muted">{blockedReason || 'Creates the live venue, labelled "Checked from official pages", with these rules. You can edit it later in Venue Agents.'}</span>
    </div>}
    {published && <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-bold text-green-800">
      Live in Venue Agents as "{item.venue.name}". Authors see it as Checked from official pages.
    </div>}
  </section>
}
