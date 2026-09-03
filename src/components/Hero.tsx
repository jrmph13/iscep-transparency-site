import { ORG } from '../data/site'
import { peso, pct, relativeTime, fullDate } from '../lib/format'
import type { Meta, Summary } from '../types'
import { CountUp } from './CountUp'
import { Slider } from './Slider'

const asset = (f: string) => (import.meta.env.BASE_URL || '/') + f

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

export function Hero({ summary, meta }: { summary: Summary; meta: Meta }) {
  const { totalCollected, remainingFunds, spent, expectedMembership, collectionRate } = summary
  const denom = Math.max(totalCollected, remainingFunds ?? 0, 1)
  const remPct = ((remainingFunds ?? 0) / denom) * 100
  const spentPct = ((spent ?? 0) / denom) * 100

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
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[46rem] max-w-[92vw] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12">
          {/* Left — identity + CTAs */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center gap-4 sm:gap-5 lg:justify-start">
              <img
                src={asset('Logo1.png')}
                alt="ISCEP emblem"
                className="h-14 w-14 object-contain drop-shadow-md sm:h-[4.5rem] sm:w-[4.5rem]"
              />
              <img
                src={asset('Logo2.png')}
                alt="Innovate · Integrate · Elevate"
                className="h-14 w-[4.5rem] object-contain drop-shadow-md sm:h-[4.5rem] sm:w-24"
              />
            </div>

            <span className="mt-5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-400 sm:text-[11px]">
              {ORG.parentLabel}
            </span>
            <h1 className="mt-2 text-balance font-display text-2xl font-bold leading-tight text-white sm:text-[2.1rem]">
              {ORG.name} Fund <span className="text-brand-400">Transparency</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-relaxed text-slate-300 lg:mx-0">
              {ORG.intro}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <a
                href="#overview"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-500"
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
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
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

          {/* Right — slider */}
          <Slider
            className="mx-auto w-full max-w-md"
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
      </section>

      {/* ---- Fund cards, overlapping the band ---- */}
      <div className="relative z-10 mx-auto -mt-10 grid w-full max-w-6xl gap-3 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
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
              className="figure text-2xl font-bold text-ink sm:text-3xl"
            />
            <span className="pb-1 text-sm text-dim">/ {peso(expectedMembership)}</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.min(collectionRate * 100, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-dim">
            Expected = {summary.totalMembers} members × {peso(summary.perMemberFee)} membership fee.
          </p>
        </div>
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
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-faint">
        {dot && <span className={'h-1.5 w-1.5 rounded-full ' + dot} />}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-ink sm:text-xl">
        {value == null ? (
          <span className="figure">—</span>
        ) : (
          <CountUp value={value} format={(x) => peso(x)} className="figure" />
        )}
      </div>
    </div>
  )
}
