/* Adds an admin-only recovery button for failed local summary/review runs. */

const API_SUMMARY_BUTTON_CLASS = 'api-summary-recovery-btn'

function apiBase() {
  return (import.meta?.env?.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

async function fetchSubmissions() {
  const res = await fetch(`${apiBase()}/api/admin/submissions/?limit=200`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}

function rowText(row, selector) {
  return (row.querySelector(selector)?.textContent || '').trim()
}

function needsApiSummary(item) {
  if (!item) return false
  return item.status === 'failed' || !String(item.editor_summary || '').trim()
}

function findItemForRow(row, items) {
  const title = rowText(row, '.data-title')
  const author = rowText(row, '.data-meta')
  return items.find(item => item.title === title && item.author_name === author)
}

async function runApiSummaryRecovery(item, button) {
  const pastedKey = window.prompt(
    'Paste Anthropic API key for this one recovery. Leave blank to use backend ANTHROPIC_API_KEY.'
  )
  if (pastedKey === null) return

  const oldText = button.textContent
  button.disabled = true
  button.textContent = 'Generating...'

  try {
    const body = pastedKey.trim() ? { api_key: pastedKey.trim() } : {}
    const res = await fetch(`${apiBase()}/api/admin/submissions/${item.id}/api-summary/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || 'API summary recovery failed')
    window.alert('API summary generated successfully.')
    window.location.reload()
  } catch (error) {
    window.alert(error.message || 'API summary recovery failed')
    button.disabled = false
    button.textContent = oldText
  }
}

function makeButton(item) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `admin-btn secondary ${API_SUMMARY_BUTTON_CLASS}`
  button.textContent = 'API Summary'
  button.title = 'Generate summary with API key'
  button.style.padding = '6px 12px'
  button.style.fontSize = '12px'
  button.style.borderRadius = '8px'
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    runApiSummaryRecovery(item, button)
  })
  return button
}

async function applyApiSummaryButtons() {
  const rows = Array.from(document.querySelectorAll('tr.data-row'))
  if (!rows.length) return

  const items = await fetchSubmissions()
  rows.forEach(row => {
    if (row.querySelector(`.${API_SUMMARY_BUTTON_CLASS}`)) return
    const item = findItemForRow(row, items)
    if (!needsApiSummary(item)) return
    const actions = row.querySelector('td:last-child > div')
    if (!actions) return
    actions.insertBefore(makeButton(item), actions.firstChild)
  })
}

function setupApiSummaryRecovery() {
  let timer = null
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => applyApiSummaryButtons().catch(() => {}), 250)
  }

  schedule()
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupApiSummaryRecovery)
  } else {
    setupApiSummaryRecovery()
  }
}
