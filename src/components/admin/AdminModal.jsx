import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Open modals, newest last. Escape closes only the top one, so a viewer opened
// on top of the submission modal closes by itself.
const openModals = []

/*
 * Centered modal overlay for the admin shell.
 * Rendered into .admin-demo-root so the scoped admin styles still apply.
 * Closes with the X button, the Escape key, or a click on the backdrop.
 */
export default function AdminModal({
  open,
  onClose,
  labelledBy,
  children,
  footer = null,
  maxWidth = 'max-w-[1180px]',
  zIndex = 'z-[70]',
  panelClassName = 'max-h-[92vh]',
}) {
  const bodyRef = useRef(null)
  const idRef = useRef(Symbol('admin-modal'))
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Depends on `open` only, so the stack keeps the order modals were opened in
  // even when a parent re-renders with a new onClose function.
  useEffect(() => {
    if (!open) return undefined
    const id = idRef.current
    openModals.push(id)
    function onKeyDown(event) {
      if (event.key === 'Escape' && openModals[openModals.length - 1] === id) {
        event.stopPropagation()
        onCloseRef.current?.()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = openModals.lastIndexOf(id)
      if (index !== -1) openModals.splice(index, 1)
    }
  }, [open])

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = 0
  }, [open])

  if (!open) return null

  const host = document.querySelector('.admin-demo-root') || document.body

  return createPortal(
    <div
      className={`admin-modal-backdrop fixed inset-0 ${zIndex} grid place-items-center bg-[#21170f]/40 p-3 backdrop-blur-[6px] md:p-6`}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose?.() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`admin-modal-panel relative flex ${panelClassName} w-full ${maxWidth} flex-col overflow-hidden rounded-[26px] border border-white/80 bg-[#fffdfb] shadow-float`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted transition hover:bg-flexee-50 hover:text-flexee-700"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 6 12 12" />
            <path d="m18 6-12 12" />
          </svg>
        </button>
        <div ref={bodyRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
        {footer}
      </div>
    </div>,
    host,
  )
}

export function ModalHeader({ id, kicker, title, children, aside = null }) {
  return <div className="sticky top-0 z-[5] border-b border-line bg-gradient-to-r from-white via-white to-flexee-50 px-6 py-4 pr-16">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-flexee-600">{kicker}</div>
        <h3 id={id} className="serif mt-0.5 break-words text-[32px] leading-none">{title}</h3>
        {children}
      </div>
      {aside && <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div>}
    </div>
  </div>
}

export function KvTable({ title, rows }) {
  return <div className="overflow-hidden rounded-2xl border border-line bg-white">
    <div className="border-b border-line bg-[#faf7f4] px-4 py-2 text-[12px] font-extrabold uppercase tracking-[.08em] text-flexee-600">{title}</div>
    <table className="kv-table w-full">
      <tbody>
        {rows.map(([label, value]) => <tr key={label} className="border-b border-line last:border-0">
          <th className="w-[38%] px-4 py-2 text-left align-top text-[13px] font-extrabold text-muted">{label}</th>
          <td className="px-4 py-2 align-top text-[14px] font-semibold text-ink">{value}</td>
        </tr>)}
      </tbody>
    </table>
  </div>
}
