import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import VenueTrustBadge from '../components/VenueTrust.jsx'
import { api } from '../api.js'

// One journal in the index (build plan step 8). A live venue shows its rules with their source and
// check date; a listed journal shows catalogue facts only and says plainly that its rules were not read.

function fmtDate(value) {
  if (!value) return ''
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Row({ label, children }) {
  return <div className="grid gap-1 border-b border-line py-2.5 last:border-0 sm:grid-cols-[200px_1fr]">
    <div className="text-[12.5px] font-extrabold uppercase tracking-[.06em] text-muted">{label}</div>
    <div className="text-[14.5px]">{children}</div>
  </div>
}

function List({ items }) {
  return items?.length ? <ul className="list-disc space-y-0.5 pl-5">{items.map(i => <li key={i}>{i}</li>)}</ul>
    : <span className="text-muted">Not stated</span>
}

export default function JournalPage({ path }) {
  const [journal, setJournal] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const [, , kind, key] = path.split('/')  // /journals/v/<slug> or /journals/i/<id>
    api(`/api/journals/${kind}/${encodeURIComponent(key || '')}/`)
      .then(body => {
        if (body.redirect) { go(body.redirect); return }
        setJournal(body.journal)
      })
      .catch(() => setError('This journal is not in the index, or it is not available right now.'))
  }, [path])

  const c = journal?.catalogue
  const rules = journal?.rules

  return <PublicationShell>
    <div className="wrap author-flow-page py-8">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/journals')}>Journal index</button> / {journal?.name || '…'}</div>
      {error && <div className="admin-error venue-admin-message mt-4">{error}</div>}
      {journal && <>
        <section className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="kicker">{journal.venue_type}{journal.publisher ? ` · ${journal.publisher}` : ''}</p>
            <h1 className="serif mt-1 text-[38px] leading-[1.05]">{journal.name}</h1>
            {journal.description && <p className="mt-2 max-w-[760px] text-[15px] text-muted">{journal.description}</p>}
          </div>
          <div className="shrink-0"><VenueTrustBadge venue={journal} withSources /></div>
        </section>

        {journal.open_calls?.length > 0 && <section className="author-panel mt-5 px-5 py-4">
          <p className="kicker">Open calls for papers</p>
          <ul className="m-0 mt-2 list-none space-y-2 p-0">{journal.open_calls.map(call => <li key={call.title + call.deadline} className="text-[14.5px]">
            <b>{call.title}</b> · deadline <b>{fmtDate(call.deadline)}</b>
            {call.url && <> · <a className="font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2" href={call.url} target="_blank" rel="noopener noreferrer">call page</a></>}
            {call.confirmed_at && <div className="text-[12.5px] text-muted">Confirmed on the official pages {fmtDate(call.confirmed_at)}. Calls we cannot re-confirm within ten days are hidden.</div>}
          </li>)}</ul>
        </section>}

        {rules ? <section className="author-panel mt-5 px-5 py-4">
          <p className="kicker">Submission rules</p>
          <p className="mt-1 text-[13px] text-muted">{journal.trust?.tier === 'claimed'
            ? 'Set by the journal’s editors in Flexee.'
            : 'Read from the journal’s official pages; each rule was confirmed against the page text. Check the journal’s own site before you submit.'}</p>
          <div className="mt-2">
            <Row label="Aims and scope">{rules.aims_scope || <span className="text-muted">Not stated</span>}</Row>
            <Row label="Article types"><List items={rules.article_types} /></Row>
            <Row label="Limits"><List items={rules.limits} /></Row>
            <Row label="Required items"><List items={rules.required_items} /></Row>
            {rules.accepted_methods?.length > 0 && <Row label="Methods"><List items={rules.accepted_methods} /></Row>}
            {rules.reporting_standards?.length > 0 && <Row label="Reporting standards"><List items={rules.reporting_standards} /></Row>}
            {Object.keys(rules.deadlines || {}).length > 0 && <Row label="Deadlines">
              <ul className="m-0 list-none space-y-0.5 p-0">{Object.entries(rules.deadlines).map(([k, v]) => <li key={k}><b>{k}:</b> {typeof v === 'string' ? v : JSON.stringify(v)}</li>)}</ul>
            </Row>}
          </div>
        </section> : <section className="author-panel mt-5 border-amber-200 bg-amber-50 px-5 py-4">
          <p className="kicker">Rules not read yet</p>
          <p className="mt-1 text-[14.5px] text-amber-900">Flexee lists this journal from open catalogues, but has not read its rules from the
            official pages yet, so it is not used for rule-based matching. Check the journal&rsquo;s own site for its author guidelines.</p>
        </section>}

        {c && <section className="author-panel mt-5 px-5 py-4">
          <p className="kicker">From the open catalogues</p>
          <p className="mt-1 text-[13px] text-muted">OpenAlex, Crossref and DOAJ{c.catalogue_checked_at ? `, refreshed ${fmtDate(c.catalogue_checked_at)}` : ''}.</p>
          <div className="mt-2">
            {c.issn && <Row label="ISSN">{(c.issns?.length ? c.issns : [c.issn]).join(', ')}</Row>}
            {c.subjects?.length > 0 && <Row label="Subjects">{c.subjects.join(' · ')}</Row>}
            <Row label="Access">{c.open_access ? 'Open access' : 'Subscription or hybrid'}{c.doaj_listed ? ' · listed in DOAJ' : ''}
              {c.apc_usd != null && c.open_access ? ` · article charge about USD ${c.apc_usd.toLocaleString()}` : ''}</Row>
            {c.first_year && <Row label="Publishing since">{c.first_year}</Row>}
            {c.works_count && <Row label="Articles published">{c.works_count.toLocaleString()}</Row>}
            {c.homepage_url && <Row label="Website"><a className="break-all font-bold text-flexee-700 underline decoration-flexee-200 underline-offset-2" href={c.homepage_url} target="_blank" rel="noopener noreferrer">{c.homepage_url}</a></Row>}
          </div>
        </section>}

        {journal.matchable && <div className="mt-5 rounded-[18px] border border-flexee-200 bg-flexee-50 px-4 py-3 text-[14px] text-flexee-900">
          <b>Check your manuscript against these rules.</b> Start a submission and Flexee compares it with this journal and others in your field.
          <button type="button" onClick={() => go('/author/new')} className="ml-2 cursor-pointer rounded-xl border-0 bg-flexee-500 px-3.5 py-1.5 text-[13px] font-extrabold text-white hover:bg-flexee-600">Start a submission</button>
        </div>}
      </>}
    </div>
  </PublicationShell>
}
