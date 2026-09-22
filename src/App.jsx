import React, { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import SubmitBook from './pages/SubmitBook.jsx'
import SubmitArticle from './pages/SubmitArticle.jsx'
import AdminPage from './pages/Admin.jsx'
import AuthorDashboard from './pages/AuthorDashboard.jsx'
import AuthorNewSubmission from './pages/AuthorNewSubmission.jsx'
import AuthorReadiness from './pages/AuthorReadiness.jsx'
import AuthorVenueMatches from './pages/AuthorVenueMatches.jsx'
import AuthorVenueAssessment from './pages/AuthorVenueAssessment.jsx'
import AuthorSubmissionStatus from './pages/AuthorSubmissionStatus.jsx'
import AuthorTransfer from './pages/AuthorTransfer.jsx'

export default function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const handler = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  if (path === '/submit-book' || path === '/submit-book.html' || path === '/submit-book.php') return <SubmitBook />
  if (path === '/submit-article' || path === '/submit-article.html' || path === '/submit-article.php') return <SubmitArticle />

  if (path === '/author') return <AuthorDashboard />
  if (path === '/author/new') return <AuthorNewSubmission />
  if (path === '/author/readiness') return <AuthorReadiness />
  if (path === '/author/venues') return <AuthorVenueMatches />
  if (path === '/author/venue-assessment' || path.startsWith('/author/venue-assessment/')) return <AuthorVenueAssessment />
  if (path === '/author/status') return <AuthorSubmissionStatus />
  if (path === '/author/transfer') return <AuthorTransfer />

  if (path.startsWith('/admin')) return <AdminPage />
  return <Home />
}
