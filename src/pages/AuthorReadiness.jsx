import React, { useEffect, useMemo, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { authorApi, currentManuscriptPath, friendlyAuthorError, getAuthorSession } from '../authorApi.js'

function prettyType(value) {
  return String(value || 'other').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

export default function AuthorReadiness() {
  const [manuscript, setManuscript] = useState(null)
  const [bundle, setBundle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [semanticBusy, setSemanticBusy] = useState(false)
  const [error, setError] = useState('')
  const [semanticError, setSemanticError] = useState('')

  async function loadReadiness({ runSemanticIfMissing = false } = {}) {
    const session = getAuthorSession()
    if (!session.manuscriptId || !session.accessToken) {
      setError('No secure manuscript session is available in this browser. Start a new submission.')
      setLoading(false)
      return
    }

    try {
      const manuscriptPayload = await authorApi(currentManuscriptPath('/'))
      setManuscript(manuscriptPayload.manuscript)

      let readinessPayload
      try {
        readinessPayload = await authorApi(currentManuscriptPath('/readiness/'))
      } catch (err) {
        if (err.status !== 404) throw err
        await authorApi(currentManuscriptPath('/readiness/run/'), { method: 'POST' })
        readinessPayload = await authorApi(currentManuscriptPath('/readiness/'))
      }

      setBundle(readinessPayload)
      setLoading(false)

      if (runSemanticIfMissing && !readinessPayload.semantic_readiness) {
        await runSemantic()
      }
    } catch (err) {
      setError(friendlyAuthorError(err))
      setLoading(false)
    }
  }

  async function runSemantic() {
    setSemanticBusy(true)
    setSemanticError('')
    try {
      await authorApi(currentManuscriptPath('/readiness/semantic/'), { method: 'POST' })
      const refreshed = await authorApi(currentManuscriptPath('/readiness/'))
      setBundle(refreshed)
    } catch (err) {
      setSemanticError(friendlyAuthorError(err))
      try {
        const refreshed = await authorApi(currentManuscriptPath('/readiness/'))
        setBundle(refreshed)
      } catch {
        // Keep the last successful deterministic result visible.
      }
    } finally {
      setSemanticBusy(false)
    }
  }

  useEffect(() => {
    loadReadiness({ runSemanticIfMissing: true })
  }, [])

  const displayed = useMemo(() => {
    const semantic = bundle?.semantic_readiness
    if (semantic?.status === 'completed') return semantic
    return bundle?.mechanical_readiness || bundle?.readiness || null
  }, [bundle])

  const findings = displayed?.findings || []
  const warnings = findings.filter(item => item.status === 'warning').length
  const blockers = findings.filter(item => item.status === 'fail' || item.severity === 'blocking').length
  const ready = Boolean(displayed?.summary?.ready_for_matching)
  const semanticProfile = displayed?.summary?.semantic_profile || manuscript?.parsed_profile?.semantic || {}
  const topics = semanticProfile.topics?.length ? semanticProfile.topics : (manuscript?.keywords || [])

  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Readiness</div>
      <AuthorFlowNav active="readiness" />
      <AuthorPrototypeNotice />

      {error && <div className="author-prototype-notice author-error-banner" role="alert"><b>Readiness unavailable.</b> {error}</div>}

      {loading ? <section className="author-panel author-live-state">
        <p className="kicker">Readiness</p>
        <h2>Loading your manuscript…</h2>
      </section> : manuscript && <>
        <div className="author-page-heading author-heading-row">
          <div>
            <p className="kicker">Readiness report</p>
            <h1 className="publication-title">{manuscript.title}</h1>
            <p className="publication-lede">Deterministic checks catch required structure and disclosure issues. The semantic agent adds grounded, advisory observations from the manuscript.</p>
          </div>
          <div className="author-readiness-score">
            <span>{bundle?.semantic_readiness?.status === 'completed' ? 'Deterministic + semantic' : 'Deterministic'}</span>
            <strong>{ready ? (warnings ? `Ready with ${warnings} update${warnings === 1 ? '' : 's'}` : 'Ready for matching') : `${blockers} blocking issue${blockers === 1 ? '' : 's'}`}</strong>
            <small>{semanticBusy ? 'Semantic readiness analysis is running now.' : displayed?.summary?.note || 'Readiness results are stored with this manuscript.'}</small>
          </div>
        </div>

        {semanticError && <div className="author-prototype-notice author-error-banner" role="alert">
          <b>Semantic analysis could not finish.</b> {semanticError}
          <button className="author-text-link author-inline-action" type="button" onClick={runSemantic} disabled={semanticBusy}>Retry semantic analysis</button>
        </div>}

        {semanticBusy && <div className="author-prototype-notice" role="status"><b>AI readiness is running.</b> Longer manuscripts are analyzed in bounded chunks, so this can take a little while.</div>}

        <div className="author-report-grid">
          <section className="author-panel author-report-panel">
            <div className="author-panel-heading">
              <div><p className="kicker">Checks</p><h2>Submission readiness</h2></div>
              <AuthorStatusPill tone={blockers ? 'warn' : warnings ? 'warn' : 'good'}>
                {blockers ? `${blockers} blocking` : warnings ? `${warnings} need attention` : 'Ready'}
              </AuthorStatusPill>
            </div>
            <div className="author-check-rows">
              {findings.length ? findings.map((item, index) => {
                const pass = item.status === 'pass'
                const fail = item.status === 'fail' || item.severity === 'blocking'
                const locator = item.source?.locator
                return <article className="author-check-row" key={item.code || `${item.label}-${index}`}>
                  <span className={`author-check-icon ${pass ? 'pass' : 'warning'}`} aria-hidden="true">{pass ? '✓' : fail ? '×' : '!'}</span>
                  <div>
                    <div className="author-check-title">
                      <h3>{item.label || item.code || 'Readiness finding'}</h3>
                      <AuthorStatusPill tone={pass ? 'good' : 'warn'}>{pass ? 'Ready' : fail ? 'Blocking' : 'Review'}</AuthorStatusPill>
                    </div>
                    <p>{item.detail}</p>
                    {locator && <small className="author-evidence-locator">{locator}</small>}
                  </div>
                </article>
              }) : <p className="author-muted-copy">No readiness findings are available yet.</p>}
            </div>
          </section>

          <aside className="author-sidebar">
            <section className="author-panel author-guide-card">
              <p className="kicker">Manuscript snapshot</p>
              <h2>What was detected</h2>
              <dl className="author-definition-list">
                <div><dt>Type</dt><dd>{prettyType(manuscript.manuscript_type)}</dd></div>
                <div><dt>Words</dt><dd>{displayed?.summary?.word_count?.toLocaleString?.() || '—'}</dd></div>
                <div><dt>File</dt><dd>{manuscript.manuscript_filename}</dd></div>
                <div><dt>Topics</dt><dd>{topics.length ? topics.join(', ') : 'Not identified yet'}</dd></div>
              </dl>
            </section>
            <section className="author-panel author-next-card">
              <p className="kicker">Next</p>
              <h2>Compare participating venues.</h2>
              <p>Matching uses each venue’s configured scope, manuscript types, policies, methods, and current editorial priorities.</p>
              <button className="copper-button" type="button" onClick={() => go('/author/venues')} disabled={!ready}>See venue matches</button>
            </section>
          </aside>
        </div>

        <div className="author-bottom-actions">
          <button className="author-secondary-button" type="button" onClick={() => go('/author/new')}>Start another manuscript</button>
          <button className="copper-button" type="button" onClick={() => go('/author/venues')} disabled={!ready}>Continue to venue matches</button>
        </div>
      </>}
    </div>
  </PublicationShell>
}
