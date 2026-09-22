import React from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'

const journey = [
  {
    step: '01',
    title: 'Upload once',
    copy: 'Add your manuscript and core author details in one workspace.',
  },
  {
    step: '02',
    title: 'Check readiness',
    copy: 'The system checks structure, required information, disclosures, and avoidable submission gaps.',
  },
  {
    step: '03',
    title: 'Compare venues',
    copy: 'Participating outlets are compared against the manuscript, with clear reasons for fit and any missing requirements.',
  },
  {
    step: '04',
    title: 'You choose',
    copy: 'Select the destination you want. The system prepares the venue-specific submission packet for editorial review.',
  },
]

export default function AuthorDashboard() {
  return <PublicationShell>
    <div className="wrap author-dashboard">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Author workspace</div>

      <section className="author-hero">
        <div>
          <p className="kicker">Author workspace</p>
          <h1 className="publication-title">Your manuscripts, one place.</h1>
          <p className="publication-lede">
            Prepare a manuscript, check its readiness, compare participating outlets, and choose where you want to submit.
          </p>
        </div>
        <button className="copper-button author-primary-action" type="button" onClick={() => go('/')}>
          Start a new submission
        </button>
      </section>

      <section className="author-stats" aria-label="Submission overview">
        <article className="author-stat-card">
          <span className="author-stat-value">0</span>
          <span className="author-stat-label">Drafts</span>
          <p>Manuscripts you have started but not submitted.</p>
        </article>
        <article className="author-stat-card">
          <span className="author-stat-value">0</span>
          <span className="author-stat-label">Needs attention</span>
          <p>Items with readiness gaps or required changes.</p>
        </article>
        <article className="author-stat-card">
          <span className="author-stat-value">0</span>
          <span className="author-stat-label">Submitted</span>
          <p>Submissions currently with an editorial team.</p>
        </article>
        <article className="author-stat-card">
          <span className="author-stat-value">0</span>
          <span className="author-stat-label">Decisions</span>
          <p>Editorial decisions available for review.</p>
        </article>
      </section>

      <div className="author-dashboard-grid">
        <section className="author-panel author-submissions-panel">
          <div className="author-panel-heading">
            <div>
              <p className="kicker">My submissions</p>
              <h2>Your manuscript activity</h2>
            </div>
          </div>

          <div className="author-empty-state">
            <div className="author-empty-mark" aria-hidden="true">＋</div>
            <h3>No manuscripts yet</h3>
            <p>
              Start with one manuscript. You will be able to follow readiness checks, venue matches,
              submission status, and later transfers from this workspace.
            </p>
            <button className="copper-button" type="button" onClick={() => go('/')}>
              Start your first submission
            </button>
          </div>
        </section>

        <aside className="author-sidebar">
          <section className="author-panel author-guide-card">
            <p className="kicker">Before you submit</p>
            <h2>What the workspace will check</h2>
            <div className="author-check-list">
              <div><span aria-hidden="true">✓</span><p><b>Readiness</b><small>Structure, required information, disclosures, and preventable gaps.</small></p></div>
              <div><span aria-hidden="true">✓</span><p><b>Venue fit</b><small>Scope, article type, policies, methods, and current editorial priorities.</small></p></div>
              <div><span aria-hidden="true">✓</span><p><b>Evidence</b><small>Important findings should point back to manuscript text, venue policy, or a verifiable source.</small></p></div>
            </div>
          </section>

          <section className="author-panel author-human-card">
            <span className="author-human-pill">Human decision</span>
            <h2>AI prepares. Editors decide.</h2>
            <p>
              The workspace helps you prepare and route the submission. Final editorial and publication decisions remain with human editors.
            </p>
          </section>
        </aside>
      </div>

      <section className="author-journey">
        <div className="author-section-heading">
          <p className="kicker">How it works</p>
          <h2>From manuscript to the right submission packet.</h2>
        </div>
        <div className="author-journey-grid">
          {journey.map(item => <article className="author-journey-card" key={item.step}>
            <span>{item.step}</span>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </article>)}
        </div>
      </section>
    </div>
  </PublicationShell>
}
