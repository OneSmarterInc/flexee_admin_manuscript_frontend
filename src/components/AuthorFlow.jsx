import React from 'react'
import { go } from './SiteChrome.jsx'
import { hasAuthorSession } from '../authorApi.js'

const steps = [
  ['details', '1', 'Manuscript', '/author/new'],
  ['readiness', '2', 'Readiness', '/author/readiness'],
  ['venues', '3', 'Venue matches', '/author/venues'],
  ['assessment', '4', 'Assessment', '/author/venue-assessment'],
  ['status', '5', 'Status', '/author/status'],
]

export function AuthorFlowNav({ active }) {
  const activeIndex = steps.findIndex(([key]) => key === active)
  const manuscriptActive = hasAuthorSession()
  return <nav className="author-flow-nav" aria-label="Author submission progress">
    {steps.map(([key, number, label, path], index) => {
      const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming'
      const disabled = key !== 'details' && !manuscriptActive
      return <button
        key={key}
        type="button"
        className={`author-flow-step ${state}`}
        onClick={() => {
          if (disabled) return
          // With an active manuscript, step 1 opens it for review/editing
          // instead of the blank "new submission" form (which resets the session).
          go(key === 'details' && manuscriptActive ? '/author/manuscript' : path)
        }}
        disabled={disabled}
        aria-disabled={disabled}
        aria-current={state === 'active' ? 'step' : undefined}
      >
        <span className="author-flow-number">{state === 'done' ? '✓' : number}</span>
        <span>{label}</span>
      </button>
    })}
  </nav>
}

export function AuthorPrototypeNotice() {
  return <div className="author-prototype-notice" role="note">
    <b>How this works.</b> AI checks help you prepare your manuscript and compare venues. You choose where to submit, and editors make the final decision.
  </div>
}

export function AuthorStatusPill({ tone = 'neutral', children }) {
  return <span className={`author-status-pill ${tone}`}>{children}</span>
}


/* Error banner with a way out; when the page has nothing else to show, also an empty-state card. */
export function AuthorPageError({ title, message, empty = false }) {
  if (!message) return null
  return <>
    <div className="author-prototype-notice author-error-banner author-page-error" role="alert">
      <span><b>{title}</b> {message}</span>
      <button type="button" className="author-secondary-button author-page-error-action" onClick={() => go('/author')}>Back to workspace</button>
    </div>
    {empty && <section className="author-panel author-empty-state">
      <p className="kicker">Nothing to show yet</p>
      <h1>Choose a manuscript in your workspace.</h1>
      <p>Open a manuscript from the author workspace to see its readiness, venue matches and submission status here.</p>
      <div className="author-empty-state-actions">
        <button type="button" className="copper-button" onClick={() => go('/author')}>Back to workspace</button>
        <button type="button" className="author-secondary-button" onClick={() => go('/author/new')}>Start a new submission</button>
      </div>
    </section>}
  </>
}
