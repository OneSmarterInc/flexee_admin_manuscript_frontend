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
  if (rules?.status === 'incomplete' || rules?.status === 'failed') {
    return <span className="inline-flex whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-[11.5px] font-extrabold text-muted"
      title={rules.error || ''}>Rules not found</span>
  }
  return null
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

export default function RulesSection({ item, onPublished, onError }) {
  const [busy, setBusy] = useState(false)
  const status = item.rules?.status || 'not_read'
  const read = item.rules_read
  if (status === 'not_read' && !read) return null

  const published = Boolean(item.venue)
  const blockedReason = item.excluded ? 'Excluded journals cannot be published. Restore it first.'
    : item.screening?.status === 'flagged' ? 'Decide the exclusion review above first (Keep or Exclude).' : ''

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
          {published ? 'Published for authors' : status === 'ready' ? 'Ready for your approval' : status === 'failed' ? 'Pages could not be read' : 'Rules not found'}
        </h4>
        <p className="mt-1 max-w-[720px] text-[13px] text-muted">
          Read by the AI{item.rules?.read_at ? ` on ${when(item.rules.read_at)}` : ''}. Only rules backed by a quote on the journal's own page are kept.
          {!published && status === 'ready' && ' Nothing is shown to authors until you publish.'}
        </p>
      </div>
      {read && <span className="inline-flex shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-[12px] font-extrabold" title="Computed from the sources, never chosen by the AI">Confidence {read.confidence}</span>}
    </div>

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
