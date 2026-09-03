import { useState } from 'react'
import { honeypotFieldProps, isBotSubmission } from '../lib/lookupGuard'
import { navigate, paymentPath } from '../lib/router'

export function LookupForm({
  compact = false,
  initialId = '',
}: {
  compact?: boolean
  initialId?: string
}) {
  const [sid, setSid] = useState(initialId)
  const [hp, setHp] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isBotSubmission(hp)) return
    if (sid.trim()) navigate(paymentPath(sid))
  }

  return (
    <form onSubmit={submit} className={compact ? '' : 'rounded-xl border border-line bg-surface2/50 p-4'}>
      {!compact && <p className="mb-2 text-sm font-medium text-ink">Check your own record</p>}
      <input {...honeypotFieldProps} value={hp} onChange={(e) => setHp(e.target.value)} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          placeholder="Student number (2026-34567)"
          inputMode="numeric"
          className="figure w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-dim focus:border-brand-500/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!sid.trim()}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          View my record
        </button>
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-dim">Shows only the record tied to that student number.</p>
      )}
    </form>
  )
}
