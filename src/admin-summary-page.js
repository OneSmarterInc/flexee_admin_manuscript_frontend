function addStyles() {
  if (document.getElementById('summary-page-css')) return
  const s = document.createElement('style')
  s.id = 'summary-page-css'
  s.textContent = `
    .summary-full-top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:28px}.summary-full-title{font-family:'Instrument Serif',Georgia,serif;font-size:42px;font-weight:400;margin:0 0 10px;color:var(--ink);line-height:1}.summary-full-sub{color:var(--muted);font-size:15px}.summary-back{border:1px solid rgba(28,26,23,.1);background:#fff;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(28,26,23,.05)}.summary-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:26px}.summary-meta-card{background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.9);border-radius:18px;padding:16px 18px;box-shadow:0 8px 28px rgba(28,26,23,.035)}.summary-label{font-size:11px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:var(--muted);margin-bottom:8px}.summary-value{font-size:15px;font-weight:700;color:var(--ink)}.summary-card{background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.95);border-radius:22px;overflow:hidden;box-shadow:0 16px 48px rgba(28,26,23,.06);margin-bottom:24px}.summary-card-head{padding:22px 24px;background:linear-gradient(135deg,rgba(168,92,50,.08),rgba(255,255,255,.6));border-bottom:1px solid rgba(168,92,50,.12)}.summary-card-head h3{margin:0;font-size:22px;color:var(--ink)}.summary-card-head p{margin:6px 0 0;color:var(--muted);font-size:14px}.summary-pre{white-space:pre-wrap;line-height:1.72;font-size:15px;color:var(--ink);padding:24px}.summary-chapters{display:grid;gap:16px}.summary-chapter{background:rgba(255,255,255,.82);border:1px solid rgba(28,26,23,.08);border-radius:18px;overflow:hidden}.summary-chapter-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:18px 20px;background:#fffaf5;border-bottom:1px solid rgba(28,26,23,.07)}.summary-chapter-name{font-weight:800;color:var(--ink);font-size:15px}.summary-chapter-path{color:var(--muted);font-size:12px;margin-top:4px}.summary-pill{white-space:nowrap;padding:6px 11px;border-radius:999px;background:rgba(28,26,23,.045);color:var(--muted);font-size:12px;font-weight:800}.summary-chapter-body{white-space:pre-wrap;line-height:1.68;padding:18px 20px;font-size:14px;color:var(--ink)}@media(max-width:900px){.summary-meta{grid-template-columns:1fr 1fr}}
  `
  document.head.appendChild(s)
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function rowInfo(row) {
  const title = row.querySelector('.data-title')?.textContent?.trim() || ''
  const meta = Array.from(row.querySelectorAll('.data-meta')).map(x => x.textContent.trim()).filter(Boolean)
  return { title, author: meta[0] || '', filename: meta.find(x => /\.(zip|pdf|docx|md)$/i.test(x)) || '' }
}

async function loadItem(row) {
  const info = rowInfo(row)
  const listRes = await fetch('/api/admin/submissions/?limit=200', { credentials: 'include' })
  const list = await listRes.json()
  const items = Array.isArray(list.items) ? list.items : []
  let item = items.find(x => x.title === info.title && x.author_name === info.author && info.filename && x.manuscript_filename === info.filename)
  if (!item) item = items.find(x => x.title === info.title && x.author_name === info.author)
  if (!item) throw new Error('Could not find this submission.')
  const detailRes = await fetch(`/api/admin/submissions/${item.id}/`, { credentials: 'include' })
  return detailRes.json()
}

function addMeta(grid, label, value) {
  const card = el('div', 'summary-meta-card')
  card.appendChild(el('div', 'summary-label', label))
  card.appendChild(el('div', 'summary-value', value || '—'))
  grid.appendChild(card)
}

function addSummaryCard(parent, title, description, text) {
  const card = el('section', 'summary-card')
  const head = el('div', 'summary-card-head')
  head.appendChild(el('h3', '', title))
  head.appendChild(el('p', '', description))
  card.appendChild(head)
  card.appendChild(el('div', 'summary-pre', text || 'No summary available.'))
  parent.appendChild(card)
}

function showSummaryPage(item) {
  addStyles()
  const shell = document.querySelector('.admin-shell')
  if (!shell) return
  shell.replaceChildren()

  const docs = Array.isArray(item.zip_contents) ? item.zip_contents : []
  const top = el('div', 'summary-full-top')
  const titleBox = el('div')
  titleBox.appendChild(el('h2', 'summary-full-title', item.title || item.manuscript_filename || 'Submission summary'))
  titleBox.appendChild(el('div', 'summary-full-sub', `${item.author_name || '—'} · ${item.kind || '—'} · ${item.manuscript_filename || ''}`))
  const back = el('button', 'summary-back', '← Back to dashboard')
  back.type = 'button'
  back.addEventListener('click', () => window.location.reload())
  top.appendChild(titleBox)
  top.appendChild(back)
  shell.appendChild(top)

  const meta = el('div', 'summary-meta')
  addMeta(meta, 'Status', item.status)
  addMeta(meta, 'AI Decision', item.decision)
  addMeta(meta, 'Words', Number(item.total_words || 0).toLocaleString())
  addMeta(meta, 'Email State', item.notification_status)
  shell.appendChild(meta)

  addSummaryCard(shell, docs.length ? 'Overall Editor Summary' : 'Editor Summary', docs.length ? 'Generated from all extracted ZIP documents.' : 'Generated for this submitted manuscript file.', item.editor_summary)

  if (docs.length) {
    const chapterCard = el('section', 'summary-card')
    const head = el('div', 'summary-card-head')
    head.appendChild(el('h3', '', 'Chapter-wise / PDF-wise Summaries'))
    head.appendChild(el('p', '', `${docs.length} document${docs.length === 1 ? '' : 's'}`))
    chapterCard.appendChild(head)
    const body = el('div', 'summary-pre')
    const list = el('div', 'summary-chapters')
    docs.forEach((doc, index) => {
      const c = el('article', 'summary-chapter')
      const ch = el('div', 'summary-chapter-head')
      const left = el('div')
      left.appendChild(el('div', 'summary-chapter-name', `${index + 1}. ${doc.filename || 'Document'}`))
      left.appendChild(el('div', 'summary-chapter-path', doc.path || ''))
      ch.appendChild(left)
      ch.appendChild(el('div', 'summary-pill', `${Number(doc.word_count || 0).toLocaleString()} words`))
      c.appendChild(ch)
      c.appendChild(el('div', 'summary-chapter-body', doc.preview || '(no summary available)'))
      list.appendChild(c)
    })
    body.appendChild(list)
    chapterCard.appendChild(body)
    shell.appendChild(chapterCard)
  }
}

function attach() {
  if (window.__summaryFullPageAttached) return
  window.__summaryFullPageAttached = true
  document.addEventListener('click', async event => {
    const summary = event.target.closest?.('.data-summary')
    if (!summary) return
    const row = summary.closest('tr')
    if (!row) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    const old = summary.textContent
    summary.textContent = 'Opening summary…'
    try {
      const item = await loadItem(row)
      showSummaryPage(item)
    } catch (error) {
      summary.textContent = old
      window.alert(error.message || 'Could not open summary page.')
    }
  }, true)
}

attach()
