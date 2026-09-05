import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { FEE_LABELS, ORG, TURNSTILE_SITE_KEY } from '../data/site'
import { peso, relativeTime } from '../lib/format'
import { checkLookupAllowed, noteLookup } from '../lib/lookupGuard'
import { navigate } from '../lib/router'
import { fetchRecord } from '../lib/api'
import type { LookupRecord } from '../types'
import { LookupForm } from './LookupForm'
import { Turnstile } from './Turnstile'

type State =
  | { s: 'idle' }
  | { s: 'loading' }
  | { s: 'found'; records: LookupRecord[] }
  | { s: 'none' }
  | { s: 'unconfigured' }
  | { s: 'not-public' }
  | { s: 'bad-key' }
  | { s: 'error'; message: string }

export function PaymentLookup({ id }: { id: string }) {
  const [state, setState] = useState<State>({ s: 'idle' })
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [cfToken, setCfToken] = useState('')
  const [cfReset, setCfReset] = useState(0)
  const aliveRef = useRef(true)

  const load = useCallback(
    (opts: { silent?: boolean } = {}) => {
      if (!id) {
        setState({ s: 'idle' })
        return
      }
      // Deep-linked lookups (?id=...) skip the form entirely, so this is the
      // one place a scraper could iterate student numbers with no UI in the
      // way — hold off until Turnstile has handed us a token.
      if (TURNSTILE_SITE_KEY && !cfToken) return
      const gate = checkLookupAllowed()
      if (!gate.ok) {
        if (!opts.silent) setState({ s: 'error', message: gate.reason })
        return
      }
      noteLookup()
      if (!opts.silent) setState({ s: 'loading' })
      fetchRecord(id, cfToken)
        .then((r) => {
          if (!aliveRef.current) return
          setSyncedAt(Date.now())
          setState(
            r.found && r.records.length ? { s: 'found', records: r.records } : { s: 'none' }
          )
        })
        .catch((e: Error) => {
          if (!aliveRef.current || opts.silent) return
          if (e.name === 'LookupNotConfigured') setState({ s: 'unconfigured' })
          else if (e.name === 'LookupNotPublic') setState({ s: 'not-public' })
          else if (e.name === 'LookupBadKey') setState({ s: 'bad-key' })
          else setState({ s: 'error', message: e.message })
        })
        .finally(() => {
          // Turnstile tokens are single-use server-side — line up a fresh one.
          setCfToken('')
          setCfReset((k) => k + 1)
        })
    },
    [id, cfToken]
  )

  useEffect(() => {
    aliveRef.current = true
    load()
    // Light "realtime": re-pull when the tab regains focus (bounded by the
    // lookup throttle, so it can't hammer the sheet).
    const onFocus = () => load({ silent: true })
    window.addEventListener('focus', onFocus)
    return () => {
      aliveRef.current = false
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const awaitingVerification = !!id && !!TURNSTILE_SITE_KEY && !cfToken && state.s === 'idle'

  return (
    <main className="animate-in mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <button
        onClick={() => navigate('#/')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to the board
      </button>

      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Your payment record</h1>
      <p className="mt-1 text-sm text-faint">
        Student no. <span className="figure text-ink">{id || '—'}</span>
      </p>

      <div className="mt-6">
        {awaitingVerification && (
          <div className="card flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-muted">
              One moment — a quick human check before we show your record.
            </p>
            <Turnstile onToken={setCfToken} resetKey={cfReset} />
          </div>
        )}

        {state.s === 'idle' && !awaitingVerification && (
          <div className="card p-6">
            <p className="text-sm text-muted">Enter your student number to pull up your record.</p>
            <div className="mt-4">
              <LookupForm compact initialId={id} />
            </div>
          </div>
        )}

        {state.s === 'loading' && (
          <div className="card flex items-center gap-3 p-6 text-sm text-faint">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            Checking the sheet…
          </div>
        )}

        {state.s === 'found' && (
          <div className="space-y-4">
            {state.records.map((r, i) => (
              <RecordCard key={i} r={r} />
            ))}
            <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
              <span>
                {state.records.length} record{state.records.length === 1 ? '' : 's'} · read live from
                the auditor&rsquo;s sheet
                {syncedAt ? ` · synced ${relativeTime(new Date(syncedAt).toISOString())}` : ''}
              </span>
              <button
                onClick={() => load()}
                className="rounded border border-line px-2 py-0.5 text-ink hover:bg-surface2"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {state.s === 'none' && (
          <div className="card p-6">
            <p className="text-sm text-muted">
              No record for <span className="figure text-ink">{id}</span>.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-faint">
              <li>Check the number format (<span className="figure">2026-34567</span>).</li>
              <li>Only students already in the receipt sheet show up here.</li>
              <li>Still missing? Message the auditor at {ORG.contactEmail}.</li>
            </ul>
            <div className="mt-5 border-t border-line pt-5">
              <LookupForm compact initialId={id} />
            </div>
          </div>
        )}

        {state.s === 'unconfigured' && (
          <div className="card p-6 text-sm text-muted">
            The record lookup isn&rsquo;t set up yet. Please message the auditor at{' '}
            <a href={`mailto:${ORG.contactEmail}`} className="text-brand-600 dark:text-brand-400">
              {ORG.contactEmail}
            </a>
            .
          </div>
        )}

        {state.s === 'not-public' && (
          <div className="card border-amber-500/30 bg-amber-500/[0.06] p-6 text-sm text-muted">
            <p className="font-medium text-ink">Lookup service needs re-deploying</p>
            <p className="mt-1">
              The Apps Script is returning Google&rsquo;s sign-in page instead of data — its Web App
              deployment isn&rsquo;t public.
            </p>
            <p className="mt-3 text-xs text-faint">
              Fix (auditor): Apps Script editor → <span className="figure">Deploy → Manage
              deployments</span> → edit the active one → <span className="figure">Who has access:
              Anyone</span> → Deploy. Then re-test <span className="figure">?route=summary</span> in an
              incognito window — it must return JSON.
            </p>
          </div>
        )}

        {state.s === 'bad-key' && (
          <div className="card border-amber-500/30 bg-amber-500/[0.06] p-6 text-sm text-muted">
            <p className="font-medium text-ink">Lookup key mismatch</p>
            <p className="mt-1 text-xs text-faint">
              <span className="figure">APPS_SCRIPT_KEY</span> in <span className="figure">src/data/site.ts</span>{' '}
              doesn&rsquo;t match <span className="figure">TX_API_KEY</span> in the Apps Script. Set both
              to the same value and re-deploy.
            </p>
          </div>
        )}

        {state.s === 'error' && (
          <div className="card border-red-500/30 bg-red-500/[0.06] p-6 text-sm text-muted">
            Couldn&rsquo;t reach the lookup service. Try again in a moment.
            <div className="mt-3 font-mono text-xs text-dim">{state.message}</div>
          </div>
        )}
      </div>
    </main>
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
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">{r.name || 'Record'}</h2>
        <span className={'rounded-md border px-2 py-0.5 text-xs ' + pill}>
          {r.status || (r.contributor ? 'Recorded' : 'No amount yet')}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-dim">{k}</dt>
            <dd className="text-muted">{v}</dd>
          </Fragment>
        ))}
      </dl>

      <div className="mt-4 border-t border-line pt-4">
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
