import React, { useEffect, useState } from 'react'
import { api } from '../../api.js'
import AdminModal from './AdminModal.jsx'

function formatTime(value) {
  const [h, m] = String(value || '02:00').split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function scheduleSummary(schedule) {
  if (!schedule) return 'Schedule'
  return schedule.enabled ? `Daily ${formatTime(schedule.time)}` : 'Schedule off'
}

function describeNextRun(iso, tz) {
  if (!iso) return null
  try {
    const when = new Date(iso)
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    return `${fmt.format(when)} (${tz})`
  } catch {
    return new Date(iso).toLocaleString()
  }
}

/* Daily schedule for venue discovery, shown in a pop-up: on/off, time and time zone. */
export default function DiscoveryScheduleCard({ open, onClose, onToast, onSaved }) {
  const [saved, setSaved] = useState(null)
  const [form, setForm] = useState({ enabled: false, time: '02:00', timezone: 'UTC' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    api('/api/admin/venue-discovery/schedule/')
      .then(result => { setSaved(result.schedule); setForm({ enabled: result.schedule.enabled, time: result.schedule.time, timezone: result.schedule.timezone }) })
      .catch(err => setError(err.message))
  }, [open])

  const dirty = saved && (saved.enabled !== form.enabled || saved.time !== form.time || saved.timezone !== form.timezone)

  async function save() {
    setBusy(true)
    setError('')
    try {
      const result = await api('/api/admin/venue-discovery/schedule/', { method: 'POST', body: JSON.stringify(form) })
      setSaved(result.schedule)
      setForm({ enabled: result.schedule.enabled, time: result.schedule.time, timezone: result.schedule.timezone })
      onSaved?.(result.schedule)
      onClose?.()
      onToast?.(result.schedule.enabled
        ? `✓ Schedule saved: discovery runs daily at ${formatTime(result.schedule.time)} (${result.schedule.timezone}).`
        : '✓ Daily run turned off. Discovery now runs only when you click "Run discovery now".')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return <AdminModal open={open} onClose={onClose} labelledBy="discovery-schedule-title" maxWidth="max-w-[560px]">
    <div className="border-b border-line bg-gradient-to-r from-white via-white to-flexee-50 px-6 py-4 pr-16">
      <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-flexee-600">Daily schedule</div>
      <h3 id="discovery-schedule-title" className="serif mt-0.5 text-[28px] leading-none">Run discovery automatically</h3>
      <div className="mt-1 text-[13px] text-muted">The background worker runs it once a day at this time.</div>
    </div>
    <div className="px-6 py-5">
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
      <div>
        <div className="text-[14px] font-extrabold">{form.enabled ? 'Daily run is on' : 'Daily run is off'}</div>
        <div className="text-[12px] text-muted">{form.enabled ? 'Discovery runs every day at the time below.' : 'Discovery runs only when you click “Run discovery now”.'}</div>
      </div>
      <button type="button" role="switch" aria-checked={form.enabled} aria-label="Run discovery automatically every day"
        onClick={() => setForm({ ...form, enabled: !form.enabled })}
        className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition ${form.enabled ? 'bg-flexee-500' : 'bg-stone-300'}`}>
        <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${form.enabled ? 'left-[21px]' : 'left-[3px]'}`}></span>
      </button>
    </div>

    <div className={`mt-3 grid gap-2 sm:grid-cols-[150px_1fr] ${form.enabled ? '' : 'opacity-50'}`}>
      <label className="block">
        <span className="mb-1 block text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">Run at</span>
        <input type="time" className="field field-compact" value={form.time} disabled={!form.enabled}
          onChange={e => setForm({ ...form, time: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-extrabold uppercase tracking-[.06em] text-muted">Time zone</span>
        <select className="field field-compact" value={form.timezone} disabled={!form.enabled}
          onChange={e => setForm({ ...form, timezone: e.target.value })}>
          {(saved?.timezones || [form.timezone]).map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </label>
    </div>

    {error && <div className="admin-error venue-admin-message mt-2">{error}</div>}

    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-[#fcfaf8] px-3 py-2">
      <div className="text-[13px]">
        <span className="text-muted">Next run: </span>
        <b>{saved?.enabled && !dirty ? describeNextRun(saved.next_run, saved.timezone) : form.enabled ? `daily at ${formatTime(form.time)} (${form.timezone}) after saving` : 'off (manual runs only)'}</b>
      </div>
      <div className="flex gap-2">
        {dirty && <button type="button" className="rounded-xl border border-line bg-white px-3 py-1.5 text-[12px] font-extrabold shadow-sm"
          onClick={() => setForm({ enabled: saved.enabled, time: saved.time, timezone: saved.timezone })}>Reset</button>}
        <button type="button" disabled={busy || !dirty} onClick={save}
          className="shine rounded-xl bg-flexee-500 px-3.5 py-1.5 text-[12px] font-extrabold text-white shadow-orange disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </div>
    <div className="mt-2 text-[12px] text-muted">Each run stops after about 25 minutes; venues it didn't reach are tried the next day. "Run discovery now" still works any time.</div>
    </div>
  </AdminModal>
}
