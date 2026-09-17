import React, { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import SubmitBook from './pages/SubmitBook.jsx'
import SubmitArticle from './pages/SubmitArticle.jsx'
import AdminPage from './pages/Admin.jsx'

export default function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const handler = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  if (path === '/submit-book' || path === '/submit-book.html' || path === '/submit-book.php') return <SubmitBook />
  if (path === '/submit-article' || path === '/submit-article.html' || path === '/submit-article.php') return <SubmitArticle />
  if (path.startsWith('/admin')) return <AdminPage />
  return <Home />
}
