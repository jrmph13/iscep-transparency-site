import { ORG } from '../data/site'
import { peso, pct, num, relativeTime, fullDate } from '../lib/format'
import type { Meta, Summary } from '../types'
import { CountUp } from './CountUp'
import { Slider } from './Slider'
import brandMark from '../assets/b1.png'
import brandWord from '../assets/b2.png'
import { useEffect, useState } from 'react'

const SLIDES = [
  {
    icon: 'M4 7h16M4 12h16M4 17h10',
    title: 'Every peso, on the record',
    body: 'Collections logged receipt by receipt, refreshed from the auditor’s sheet every 30 minutes.',
  },
  {
    icon: 'M12 3v18M5 10l7-7 7 7',
    title: 'See where it goes',
    body: 'Remaining balance and each recorded disbursement — what it was for and who approved it.',
  },
  {
    icon: 'M12 3l7 3v5c0 4.5-3 8.4-7 9.5C8 19.4 5 15.5 5 11V6l7-3z',
    title: 'Private by design',
    body: 'No names or ID numbers are listed. You can only see your own record, with your student number and last name.',
  },
  {
    icon: 'M4 19V5M4 19h16M8 15v-4M13 15V8M18 15v-6',
    title: 'Section by section',
    body: 'Track how each year & section is doing against the ₱50 membership fee.',
  },
]

const TRUST = [
  { icon: 'M12 3l7 3v5c0 4.5-3 8.4-7 9.5C8 19.4 5 15.5 5 11V6l7-3z', label: 'Read-only — nothing editable here' },
  { icon: 'M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Synced every 30 minutes' },
  { icon: 'M4 7h16M4 12h16M4 17h10', label: 'Straight from the auditor’s receipt sheet' },
  { icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.5 12S5 5 12 5s9.5 7 9.5 7-2.5 7-9.5 7-9.5-7-9.5-7z', label: 'No names or ID numbers published' },
]

export function Hero({ summary, meta }: { summary: Summary; meta: Meta }) {
  const {
    totalCollected,
    remainingFunds,
    spent,
    expectedMembership,
    collectionRate,
    totalMembers,
    contributors,
  } = summary
  const denom = Math.max(totalCollected, remainingFunds ?? 0, 1)
  const remPct = ((remainingFunds ?? 0) / denom) * 100
  const spentPct = ((spent ?? 0) / denom) * 100
  const ratePct = Math.min(Math.max(collectionRate * 100, 0), 100)

  return (
    <div>
      {/* ---- Landing band ---- */}
      <section
        id="top"
        className="relative overflow-hidden bg-navy-900 text-white"
        style={{
          backgroundImage:
            'radial-gradient(#1b263b 1px, transparent 1px), radial-gradient(#1b263b 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
        }}
      >
        {/* decorative light */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[46rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-500/10 blur-[110px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-12">
          {/* eyebrow badge */}
          <div className="flex justify-center lg:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300 backdrop-blur-sm sm:text-[11px]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-brand-400" fill="none">
                <path d="M12 3l7 3v5c0 4.5-3 8.4-7 9.5C8 19.4 5 15.5 5 11V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {ORG.portalLabel}
            </span>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12">
            {/* Left — identity + CTAs */}
            <div className="text-center lg:text-left">
              <LogoReveal>
                <div className="flex items-center justify-center gap-4 sm:gap-5 lg:justify-start">
                  <img
                    src={brandMark}
                    alt="ISCEP emblem"
                    className="h-20 w-20 object-contain drop-shadow-md sm:h-24 sm:w-24"
                  />
                  <img
                    src={brandWord}
                    alt="Innovate · Integrate · Elevate"
                    className="h-20 w-36 object-contain drop-shadow-md sm:h-24 sm:w-44"
                  />
                </div>
              </LogoReveal>

              <span className="mt-5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-400 sm:text-[11px]">
                {ORG.parentLabel}
              </span>
              <h1 className="mt-2 text-balance font-display text-2xl font-bold leading-tight text-white sm:text-[2.1rem]">
                {ORG.name} Fund <span className="text-brand-400">Transparency</span>
              </h1>
              <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-relaxed text-slate-300 lg:mx-0">
                {ORG.intro}
              </p>

              {/* trust chips */}
              <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left sm:grid-cols-2 lg:mx-0">
                {TRUST.map((t) => (
                  <li key={t.label} className="flex items-start gap-2 text-xs leading-snug text-slate-300">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" fill="none">
                      <path d={t.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t.label}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <a
                  href="#overview"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-500"
                >
                  See the funds
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href="#records"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Check my record
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href="#about"
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-300 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  How this works
                </a>
              </div>

              <div className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Updated {relativeTime(meta.fetchedAt)}
                <span className="text-slate-500">·</span>
                <span className="text-slate-400" title={fullDate(meta.fetchedAt)}>
                  {meta.recordCount} receipts on record
                </span>
              </div>
            </div>

            {/* Right — board snapshot + slider */}
            <div className="mx-auto w-full max-w-md space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Board snapshot
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.14em] text-slate-500"
                    title={fullDate(meta.fetchedAt)}
                  >
                    live mirror
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Mini label="Collected" value={totalCollected} money />
                  <Mini label="Remaining" value={remainingFunds} money accent />
                  <Mini label="Members" value={totalMembers} />
                  <Mini label="Paid in" value={contributors} />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="uppercase tracking-[0.14em]">Collection progress</span>
                    <span className="figure text-slate-200">{pct(collectionRate, 1)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-out"
                      style={{ width: `${ratePct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    {peso(totalCollected)} of {peso(expectedMembership)} expected membership dues.
                  </p>
                </div>
              </div>

              <Slider
                slides={SLIDES.map((s) => (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path d={s.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold text-white">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{s.body}</p>
                  </div>
                ))}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---- Fund cards, overlapping the band ---- */}
      <div className="relative z-10 mx-auto -mt-12 grid w-full max-w-6xl gap-3 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5 shadow-lg shadow-navy-900/10">
          <div className="flex items-baseline justify-between">
            <span className="kicker">Where the money is</span>
            <span className="hidden text-xs text-dim sm:inline">per receipt sheet</span>
          </div>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-brand-500 transition-[width] duration-700 ease-out"
              style={{ width: `${remPct}%` }}
              title={`Remaining ${peso(remainingFunds)}`}
            />
            <div
              className="h-full bg-amber-400 transition-[width] duration-700 ease-out"
              style={{ width: `${spentPct}%` }}
              title={`Spent ${peso(spent)}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Remaining balance
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Spent (recorded)
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <Figure label="Collected" value={totalCollected} tone="brand" />
            <Figure label="Remaining" value={remainingFunds} dot="bg-brand-500" />
            <Figure label="Spent (recorded)" value={spent} dot="bg-amber-500" />
          </div>
        </div>

        <div className="card p-5 shadow-lg shadow-navy-900/10">
          <div className="flex items-baseline justify-between">
            <span className="kicker">Collection progress</span>
            <span className="figure text-xs text-faint">{pct(collectionRate, 1)}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-x-2">
            <CountUp
              value={totalCollected}
              format={(x) => peso(x)}
              className="stat text-3xl text-ink sm:text-4xl"
            />
            <span className="pb-1 text-sm text-dim">/ {peso(expectedMembership)}</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-out"
              style={{ width: `${ratePct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-dim">
            Expected = {num(summary.totalMembers)} members × {peso(summary.perMemberFee)} membership fee.
          </p>
        </div>
      </div>

      {/* ---- How it works strip ---- */}
      <div className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6">
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            {
              n: '01',
              t: 'The auditor logs a receipt',
              d: 'Each payment is entered on the official spreadsheet as it is collected.',
            },
            {
              n: '02',
              t: 'Totals rebuild every 30 min',
              d: 'A scheduled job re-reads the sheet and republishes the figures on this page.',
            },
            {
              n: '03',
              t: 'You verify against your receipt',
              d: 'Check the section totals, or look up your own record with your student number.',
            },
          ].map((s) => (
            <li key={s.n} className="card card-hover p-4">
              <span className="stat text-xl text-brand-600 dark:text-brand-400">{s.n}</span>
              <h3 className="mt-1 font-display text-[15px] font-semibold text-ink">{s.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-dim">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function LogoReveal({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={
        'transition-all duration-[1800ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ' +
        (visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')
      }
    >
      {children}
    </div>
  )
}

function Mini({
  label,
  value,
  money,
  accent,
}: {
  label: string
  value: number | null
  money?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={
        'rounded-xl border p-3 ' +
        (accent ? 'border-brand-500/30 bg-brand-500/10' : 'border-white/10 bg-white/[0.03]')
      }
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg text-white">
        {value == null ? (
          <span className="stat">—</span>
        ) : (
          <CountUp
            value={value}
            format={(x) => (money ? peso(x) : num(x))}
            className="stat"
          />
        )}
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  tone,
  dot,
}: {
  label: string
  value: number | null
  tone?: 'brand'
  dot?: string
}) {
  return (
    <div
      className={
        'rounded-xl border p-3 ' +
        (tone === 'brand' ? 'border-brand-500/40 bg-brand-500/10' : 'border-line bg-surface2/60')
      }
    >
      <div className="label flex items-center gap-1.5">
        {dot && <span className={'h-1.5 w-1.5 rounded-full ' + dot} />}
        {label}
      </div>
      <div className="mt-0.5 text-2xl text-ink sm:text-[1.6rem]">
        {value == null ? (
          <span className="stat">—</span>
        ) : (
          <CountUp value={value} format={(x) => peso(x)} className="stat" />
        )}
      </div>
    </div>
  )
}
