import React, { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import SubmitBook from './pages/SubmitBook.jsx'
import SubmitArticle from './pages/SubmitArticle.jsx'
import AdminPage from './pages/Admin.jsx'
import AuthorDashboard from './pages/AuthorDashboard.jsx'
import AuthorLogin from './pages/AuthorLogin.jsx'
import AuthorSignup from './pages/AuthorSignup.jsx'
import AuthorNewSubmission from './pages/AuthorNewSubmission.jsx'
import AuthorReadiness from './pages/AuthorReadiness.jsx'
import AuthorVenueMatches from './pages/AuthorVenueMatches.jsx'
import AuthorVenueAssessment from './pages/AuthorVenueAssessment.jsx'
import AuthorSubmissionStatus from './pages/AuthorSubmissionStatus.jsx'
import AuthorTransfer from './pages/AuthorTransfer.jsx'
import AuthorManuscriptDetails from './pages/AuthorManuscriptDetails.jsx'
import { fetchAuthorSession } from './authorApi.js'

function RequireAuthor({ children }) {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let active = true

    fetchAuthorSession()
      .then(user => {
        if (!active) return
        if (user) {
          setAllowed(true)
          return
        }
        window.history.replaceState({}, '', '/author/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      .catch(() => {
        if (!active) return
        window.history.replaceState({}, '', '/author/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })

    return () => {
      active = false
    }
  }, [])

  if (!allowed) return null
  return children
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const handler = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  if (path === '/submit-book' || path === '/submit-book.html' || path === '/submit-book.php') return <SubmitBook />
  if (path === '/submit-article' || path === '/submit-article.html' || path === '/submit-article.php') return <SubmitArticle />

  if (path === '/author/login') return <AuthorLogin />
  if (path === '/author/signup') return <AuthorSignup />
  if (path === '/author') return <RequireAuthor><AuthorDashboard /></RequireAuthor>
  if (path === '/author/new') return <RequireAuthor><AuthorNewSubmission /></RequireAuthor>
  if (path === '/author/manuscript-details') return <RequireAuthor><AuthorManuscriptDetails /></RequireAuthor>
  if (path === '/author/readiness') return <RequireAuthor><AuthorReadiness /></RequireAuthor>
  if (path === '/author/venues') return <RequireAuthor><AuthorVenueMatches /></RequireAuthor>
  if (path === '/author/venue-assessment' || path.startsWith('/author/venue-assessment/')) return <RequireAuthor><AuthorVenueAssessment /></RequireAuthor>
  if (path === '/author/status') return <RequireAuthor><AuthorSubmissionStatus /></RequireAuthor>
  if (path === '/author/transfer') return <RequireAuthor><AuthorTransfer /></RequireAuthor>

  if (path.startsWith('/admin')) return <AdminPage path={path} />
  return <Home />
}
