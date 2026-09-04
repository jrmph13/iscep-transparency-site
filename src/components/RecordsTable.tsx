import { Fragment, useState } from 'react'
import { FEE_LABELS } from '../data/site'
import { formatStudentId, num, peso } from '../lib/format'
import { fetchRecord } from '../lib/api'
import { checkLookupAllowed, honeypotFieldProps, isBotSubmission, noteLookup } from '../lib/lookupGuard'
import { navigate, paymentPath } from '../lib/router'
import type { LookupRecord } from '../types'
import { Section } from './Section'

type State =
  | { s: 'idle' }
  | { s: 'loading' }
  | { s: 'found'; records: LookupRecord[] }
  | { s: 'none' }
  | { s: 'error'; msg: string }

/**
 * The individual receipts are intentionally NOT browsable as a public list.
 * A student searches their own record by student number — the result shows
 * inline here, and "Open full view" deep-links to the shareable lookup page.
 */
export function RecordsTable({ total }: { total: number }) {
  const [sid, setSid] = useState('')
  const [hp, setHp] = useState('')
  const [state, setState] = useState<State>({ s: 'idle' })

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (isBotSubmission(hp)) return
    const id = sid.trim()
    if (!id) return
    const gate = checkLookupAllowed()
    if (!gate.ok) {
      setState({ s: 'error', msg: gate.reason })
      return
    }
    noteLookup()
    setState({ s: 'loading' })
    try {
      const r = await fetchRecord(id)
      setState(r.found && r.records.length ? { s: 'found', records: r.records } : { s: 'none' })
    } catch (err) {
      setState({ s: 'error', msg: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <Section
      id="records"
      title="Receipt records"
      subtitle="Receipts aren’t listed here. Search your own by student number."
    >
      <div className="mx-auto max-w-2xl">
        <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
          <input {...honeypotFieldProps} value={hp} onChange={(e) => setHp(e.target.value)} />
          <input
            value={sid}
            onChange={(e) => setSid(formatStudentId(e.target.value))}
            placeholder="Student number (2026-34567)"
            inputMode="numeric"
            className="figure w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-dim focus:border-brand-500/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!sid.trim() || state.s === 'loading'}
            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {state.s === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="mt-4">
          {state.s === 'loading' && (
            <div className="card flex items-center gap-3 p-4 text-sm text-faint">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Reading the auditor’s sheet…
            </div>
          )}

          {state.s === 'none' && (
            <div className="card p-4 text-sm text-muted">
              No record for <span className="figure text-ink">{sid.trim()}</span>. Check the format
              (<span className="figure">2026-34567</span>) — only students already in the receipt
              sheet appear.
            </div>
          )}

          {state.s === 'error' && (
            <div className="card border-red-500/30 bg-red-500/[0.06] p-4 text-sm text-muted">
              Couldn’t reach the lookup service right now. Try again in a moment.
              <div className="mt-2 font-mono text-xs text-dim">{state.msg}</div>
            </div>
          )}

          {state.s === 'found' && (
            <div className="space-y-3">
              {state.records.map((r, i) => (
                <RecordCard key={i} r={r} />
              ))}
              <button
                onClick={() => navigate(paymentPath(sid.trim()))}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Open full view ↗
              </button>
            </div>
          )}

          {state.s === 'idle' && (
            <div className="rounded-xl border border-line bg-surface p-4 text-sm text-faint">
              <p>
                <span className="figure text-ink">{num(total)}</span> receipts are on record. The
                public board shows only totals and the per-section breakdown above — no name lists,
                no receipt or ID numbers.
              </p>
              <p className="mt-2 text-xs text-dim">
                Officers who need the full sheet can open the source spreadsheet linked in{' '}
                <a href="#about" className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  About this board
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

function RecordCard({ r }: { r: LookupRecord }) {
  const partial = /partial/i.test(r.status)
  const good = /paid/i.test(r.status) && !/unpaid|partial/i.test(r.status)
  const pill = partial
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    : good
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : 'border-line bg-surface2 text-faint'

  const rows: [string, string][] = [
    ['Name', r.name || '—'],
    ['Year & section', r.section || '—'],
    ['Amount recorded', r.amount ? `${peso(r.amount)} (${r.amountLabel || '—'})` : '—'],
    ['Payment status', r.status || '—'],
    ['Date of payment', r.datePaid || '—'],
    ['Cashier', r.cashier || '—'],
    ['Timestamp', r.timestamp || '—'],
  ]

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-ink">{r.name || 'Record'}</h3>
        <span className={'rounded-md border px-2 py-0.5 text-xs ' + pill}>
          {r.status || (r.contributor ? 'Recorded' : 'No amount yet')}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-dim">{k}</dt>
            <dd className="text-muted">{v}</dd>
          </Fragment>
        ))}
      </dl>

      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-dim">Line items</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(r.fees).map(([key, val]) => {
            const paid = /^paid$/i.test(val)
            return (
              <span
                key={key}
                className={
                  'rounded-md border px-2 py-1 text-xs ' +
                  (paid
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-line bg-surface2 text-faint')
                }
              >
                {FEE_LABELS[key] ?? key}: {val || '—'}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
