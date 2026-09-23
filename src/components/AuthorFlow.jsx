import React from 'react'
import { go } from './SiteChrome.jsx'

const steps = [
  ['details', '1', 'Manuscript', '/author/new'],
  ['readiness', '2', 'Readiness', '/author/readiness'],
  ['venues', '3', 'Venue matches', '/author/venues'],
  ['assessment', '4', 'Assessment', '/author/venue-assessment'],
  ['status', '5', 'Status', '/author/status'],
]

export function AuthorFlowNav({ active }) {
  const activeIndex = steps.findIndex(([key]) => key === active)
  return <nav className="author-flow-nav" aria-label="Author submission progress">
    {steps.map(([key, number, label, path], index) => {
      const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming'
      return <button
        key={key}
        type="button"
        className={`author-flow-step ${state}`}
        onClick={() => go(path)}
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
    <b>Live author workflow.</b> Readiness, venue matching, assessment, and submission data on these pages now come from the backend. AI findings support preparation; the author chooses the destination and human editors retain the publication decision.
  </div>
}

export function AuthorStatusPill({ tone = 'neutral', children }) {
  return <span className={`author-status-pill ${tone}`}>{children}</span>
}
