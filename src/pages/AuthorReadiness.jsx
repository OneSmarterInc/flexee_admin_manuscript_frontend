import React from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { AuthorFlowNav, AuthorPrototypeNotice, AuthorStatusPill } from '../components/AuthorFlow.jsx'
import { previewManuscript, readinessChecks } from '../data/authorMockData.js'

function draftTitle() {
  try {
    return JSON.parse(sessionStorage.getItem('authorDraft') || '{}').title || previewManuscript.title
  } catch {
    return previewManuscript.title
  }
}

export default function AuthorReadiness() {
  const warnings = readinessChecks.filter(item => item.state === 'warning').length
  return <PublicationShell>
    <div className="wrap author-flow-page">
      <div className="crumb"><button className="author-text-link" type="button" onClick={() => go('/author')}>Author workspace</button> / Readiness</div>
      <AuthorFlowNav active="readiness" />
      <AuthorPrototypeNotice />

      <div className="author-page-heading author-heading-row">
        <div>
          <p className="kicker">Readiness report</p>
          <h1 className="publication-title">{draftTitle()}</h1>
          <p className="publication-lede">Fix avoidable issues before you spend time preparing a formal submission for a venue.</p>
        </div>
        <div className="author-readiness-score">
          <span>Preview</span>
          <strong>Ready with {warnings} updates</strong>
          <small>No blocking structural issue shown in this frontend preview.</small>
        </div>
      </div>

      <div className="author-report-grid">
        <section className="author-panel author-report-panel">
          <div className="author-panel-heading">
            <div><p className="kicker">Checks</p><h2>Submission readiness</h2></div>
            <AuthorStatusPill tone="warn">{warnings} need attention</AuthorStatusPill>
          </div>
          <div className="author-check-rows">
            {readinessChecks.map(item => <article className="author-check-row" key={item.label}>
              <span className={`author-check-icon ${item.state}`} aria-hidden="true">{item.state === 'pass' ? '✓' : '!'}</span>
              <div>
                <div className="author-check-title">
                  <h3>{item.label}</h3>
                  <AuthorStatusPill tone={item.state === 'pass' ? 'good' : 'warn'}>{item.state === 'pass' ? 'Ready' : 'Review'}</AuthorStatusPill>
                </div>
                <p>{item.detail}</p>
              </div>
            </article>)}
          </div>
        </section>

        <aside className="author-sidebar">
          <section className="author-panel author-guide-card">
            <p className="kicker">Manuscript snapshot</p>
            <h2>What was detected</h2>
            <dl className="author-definition-list">
              <div><dt>Type</dt><dd>{previewManuscript.type}</dd></div>
              <div><dt>Words</dt><dd>{previewManuscript.words.toLocaleString()}</dd></div>
              <div><dt>References</dt><dd>{previewManuscript.references}</dd></div>
              <div><dt>Topics</dt><dd>{previewManuscript.keywords.join(', ')}</dd></div>
            </dl>
          </section>
          <section className="author-panel author-next-card">
            <p className="kicker">Next</p>
            <h2>Compare participating venues.</h2>
            <p>Matching looks at scope, article type, policies, methods, and current editorial demand.</p>
            <button className="copper-button" type="button" onClick={() => go('/author/venues')}>See venue matches</button>
          </section>
        </aside>
      </div>

      <div className="author-bottom-actions">
        <button className="author-secondary-button" type="button" onClick={() => go('/author/new')}>Edit manuscript details</button>
        <button className="copper-button" type="button" onClick={() => go('/author/venues')}>Continue to venue matches</button>
      </div>
    </div>
  </PublicationShell>
}
