import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiBlob } from '../../api.js'
import AdminModal from './AdminModal.jsx'

/*
 * In-portal manuscript viewer for the admin editor workspace.
 * PDF  -> the browser's PDF viewer inside the modal (from a local blob URL)
 * DOCX -> formatted HTML via mammoth, sanitised before display
 * MD   -> formatted HTML via marked, sanitised
 * TXT  -> plain text
 * ZIP  -> opened in the browser; files inside on the left, selected file on the right
 * Everything is converted in the admin's browser; nothing is sent to a third
 * party. Converted HTML goes through DOMPurify with a strict allow-list, so no
 * scripts, styles, forms or event handlers reach the portal.
 */

const PREVIEWABLE = ['.pdf', '.docx', '.md', '.markdown', '.txt']

function extensionOf(name) {
  const match = String(name || '').toLowerCase().match(/\.[a-z0-9]+$/)
  return match ? match[0] : ''
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function typeLabel(name) {
  const ext = extensionOf(name)
  return { '.pdf': 'PDF', '.docx': 'Word', '.md': 'Markdown', '.markdown': 'Markdown', '.txt': 'Text', '.zip': 'ZIP' }[ext] || ext.replace('.', '').toUpperCase()
}

/* ---------------- Sanitiser ---------------- */

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'sub',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'br', 'hr', 'span',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'a', 'img',
]
const ALLOWED_ATTR = ['href', 'src', 'alt', 'colspan', 'rowspan']

let purifier = null
async function loadPurifier() {
  if (purifier) return purifier
  const { default: DOMPurify } = await import('dompurify')
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || ''
      if (/^(https?:|mailto:)/i.test(href)) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      } else {
        node.removeAttribute('href')
      }
    }
    if (node.tagName === 'IMG') {
      // Only images embedded in the document itself; nothing is fetched from the web.
      const src = node.getAttribute('src') || ''
      if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src)) node.remove()
    }
  })
  purifier = DOMPurify
  return purifier
}

async function sanitizeHtml(html) {
  const DOMPurify = await loadPurifier()
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|data:image\/(?:png|jpe?g|gif|webp);base64,)/i,
  })
}

const MAX_ENTRY_BYTES = 60 * 1024 * 1024

function isPreviewableEntry(name) {
  const base = name.split('/').pop()
  if (!base || base.startsWith('.') || name.startsWith('__MACOSX/')) return false
  return PREVIEWABLE.includes(extensionOf(name))
}

/* ---------------- Rendering one file ---------------- */

async function renderFile(blob, name) {
  const ext = extensionOf(name)
  if (ext === '.pdf') {
    return { kind: 'pdf', url: URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })) }
  }
  if (ext === '.docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() })
    return { kind: 'html', html: await sanitizeHtml(result.value || '<p><em>This document has no readable text.</em></p>') }
  }
  if (ext === '.md' || ext === '.markdown') {
    const { marked } = await import('marked')
    return { kind: 'html', html: await sanitizeHtml(marked.parse(await blob.text(), { async: false, gfm: true })) }
  }
  if (ext === '.txt') {
    return { kind: 'text', text: await blob.text() }
  }
  return { kind: 'unsupported' }
}

function FileView({ view }) {
  if (!view) return null
  if (view.kind === 'pdf') {
    return <iframe title="Manuscript PDF" src={view.url} className="h-full w-full rounded-2xl border border-line bg-white" />
  }
  if (view.kind === 'html') {
    return <div className="thin-scroll h-full overflow-y-auto rounded-2xl border border-line bg-white px-6 py-6 md:px-10">
      <article className="manuscript-doc mx-auto max-w-[860px]" dangerouslySetInnerHTML={{ __html: view.html }} />
    </div>
  }
  if (view.kind === 'text') {
    return <div className="thin-scroll h-full overflow-y-auto rounded-2xl border border-line bg-white px-6 py-6 md:px-10">
      <pre className="manuscript-doc mx-auto max-w-[860px] whitespace-pre-wrap font-sans text-[15px] leading-7">{view.text}</pre>
    </div>
  }
  return <div className="grid h-full place-items-center rounded-2xl border border-dashed border-line bg-white p-8 text-center">
    <div>
      <div className="text-[15px] font-extrabold">This file type cannot be previewed.</div>
      <p className="mt-1 text-[14px] text-muted">Use “Download manuscript” to open it on your computer.</p>
    </div>
  </div>
}

/* ---------------- Viewer modal ---------------- */

export default function ManuscriptViewer({ open, onClose, submissionId, filename, fileBytes, onDownload, downloading = false }) {
  const isZip = extensionOf(filename) === '.zip'
  const [entries, setEntries] = useState([])
  const [activeEntry, setActiveEntry] = useState('')
  const [view, setView] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const zipRef = useRef(null)

  // Free the PDF blob URL whenever the displayed file changes or the viewer closes.
  useEffect(() => () => { if (view?.url) URL.revokeObjectURL(view.url) }, [view])

  useEffect(() => {
    if (!open || !submissionId) return undefined
    let cancelled = false
    zipRef.current = null
    setEntries([]); setActiveEntry(''); setView(null); setError(''); setLoading(true)

    async function load() {
      try {
        const { blob } = await apiBlob(`/api/admin/venue-submissions/${submissionId}/view/`)
        if (isZip) {
          const { default: JSZip } = await import('jszip')
          const zip = await JSZip.loadAsync(await blob.arrayBuffer())
          const files = Object.values(zip.files)
            .filter(file => !file.dir && isPreviewableEntry(file.name))
            .map(file => ({ name: file.name, size: file._data?.uncompressedSize || 0 }))
            .sort((x, y) => x.name.localeCompare(y.name))
          if (cancelled) return
          zipRef.current = zip
          setEntries(files)
          if (!files.length) {
            setError('No previewable files (PDF, Word, Markdown, or text) were found in this ZIP. Use Download to open it.')
            setLoading(false)
            return
          }
          setActiveEntry(files[0].name)
          return
        }
        const rendered = await renderFile(blob, filename)
        if (!cancelled) setView(rendered)
      } catch (err) {
        if (!cancelled) setError(err.message || 'The manuscript could not be opened.')
      } finally {
        if (!cancelled && !isZip) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, submissionId, filename])

  useEffect(() => {
    if (!open || !isZip || !activeEntry || !zipRef.current) return undefined
    let cancelled = false
    setLoading(true); setError(''); setView(null)
    async function loadEntry() {
      try {
        const file = zipRef.current.file(activeEntry)
        if (!file) throw new Error('This file is no longer available in the archive.')
        if ((file._data?.uncompressedSize || 0) > MAX_ENTRY_BYTES) {
          throw new Error('This file is too large to preview. Use Download to open it.')
        }
        const blob = await file.async('blob')
        const rendered = await renderFile(blob, activeEntry)
        if (!cancelled) setView(rendered)
      } catch (err) {
        if (!cancelled) setError(err.message || 'This file could not be opened.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadEntry()
    return () => { cancelled = true }
  }, [open, isZip, activeEntry])

  const subtitle = useMemo(
    () => [typeLabel(filename), formatBytes(fileBytes)].filter(Boolean).join(' · '),
    [filename, fileBytes],
  )

  return <AdminModal
    open={open}
    onClose={onClose}
    labelledBy="manuscript-viewer-title"
    maxWidth="max-w-[1400px]"
    zIndex="z-[80]"
    panelClassName="h-[92vh]"
  >
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-line bg-gradient-to-r from-white via-white to-flexee-50 px-6 py-4 pr-16 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-flexee-600">Manuscript viewer</div>
          <h3 id="manuscript-viewer-title" className="serif mt-0.5 break-words text-[26px] leading-tight">{filename || 'Manuscript'}</h3>
          {subtitle && <div className="mt-1 text-[13px] font-medium text-muted">{subtitle}</div>}
        </div>
        {onDownload && <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="shrink-0 rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-extrabold shadow-sm hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? 'Downloading…' : 'Download'}
        </button>}
      </div>

      <div className={`grid min-h-0 flex-1 gap-4 p-4 md:p-5 ${isZip ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : ''}`}>
        {isZip && <aside className="thin-scroll min-h-0 overflow-y-auto rounded-2xl border border-line bg-white p-2">
          <div className="px-2 pb-2 pt-1 text-[12px] font-extrabold uppercase tracking-[.08em] text-muted">Files in archive</div>
          {entries.map(entry => <button
            key={entry.name}
            type="button"
            onClick={() => setActiveEntry(entry.name)}
            className={`mb-1 block w-full rounded-xl px-3 py-2 text-left transition ${entry.name === activeEntry ? 'bg-flexee-50 text-flexee-800 ring-1 ring-flexee-100' : 'hover:bg-[#fcfaf8]'}`}
          >
            <div className="break-all text-[13px] font-extrabold">{entry.name.split('/').pop()}</div>
            <div className="mt-0.5 text-[12px] text-muted">{typeLabel(entry.name)}{entry.size ? ` · ${formatBytes(entry.size)}` : ''}</div>
          </button>)}
        </aside>}

        <div className="min-h-0">
          {error ? <div className="admin-error venue-admin-message">{error}</div>
            : loading && !view ? <div className="grid h-full place-items-center rounded-2xl border border-line bg-white text-[14px] font-semibold text-muted">Opening manuscript…</div>
            : <FileView view={view} />}
        </div>
      </div>
    </div>
  </AdminModal>
}

export { sanitizeHtml, PREVIEWABLE }
