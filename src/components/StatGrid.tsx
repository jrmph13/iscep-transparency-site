import { FEE_LABELS } from '../data/site'
import { num, peso, pct } from '../lib/format'
import type { Summary } from '../types'
import { Section } from './Section'
import { CountUp } from './CountUp'

export function StatGrid({ summary }: { summary: Summary }) {
  const contribRate = summary.totalMembers ? summary.contributors / summary.totalMembers : 0
  const avg = summary.contributors ? Math.round(summary.totalCollected / summary.contributors) : 0

  return (
    <Section
      id="overview"
      no="01"
      title="Overview"
      subtitle="Totals worked out from the receipt sheet."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Members on record" value={summary.totalMembers} fmt={num} sub="rows in the sheet" />
        <Stat
          label="Contributors"
          value={summary.contributors}
          fmt={num}
          sub={`${pct(contribRate)} of members have paid`}
          bar={contribRate * 100}
        />
        <Stat
          label="No amount yet"
          value={summary.pending}
          fmt={num}
          sub="recorded but unpaid"
          muted
        />
        <Stat
          label="Total collected"
          value={summary.totalCollected}
          fmt={(n) => peso(n)}
          sub={`avg ${peso(avg)} per contributor`}
          accent
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="card p-5">
          <div className="kicker">Receipt status</div>
          <ul className="mt-4 space-y-3.5">
            {summary.statusCounts.map((s) => {
              const w = summary.totalMembers ? (s.count / summary.totalMembers) * 100 : 0
              return (
                <li key={s.label} className="text-sm">
                  <div className="flex items-center justify-between text-muted">
                    <span>{s.label}</span>
                    <span className="figure text-faint">{num(s.count)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-brand-500/70 transition-[width] duration-700 ease-out"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="card p-5">
          <div className="kicker">Paid line items</div>
          <p className="mt-1 text-xs text-dim">
            How many receipts have each fee marked “Paid”.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(summary.feeCounts).map(([key, count]) => (
              <div
                key={key}
                className={
                  'rounded-xl border p-3 ' +
                  (count > 0
                    ? 'border-brand-500/30 bg-brand-600/10'
                    : 'border-line bg-surface2/60')
                }
              >
                <div className="text-[11px] uppercase tracking-wide text-faint">
                  {FEE_LABELS[key] ?? key}
                </div>
                <div className="figure mt-1 text-lg font-semibold text-ink">{num(count)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}

function Stat({
  label,
  value,
  fmt,
  sub,
  bar,
  accent,
  muted,
}: {
  label: string
  value: number
  fmt: (n: number) => string
  sub: string
  bar?: number
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={
        'rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ' +
        (accent
          ? 'border-brand-500/40 bg-brand-600/10'
          : muted
            ? 'border-line bg-surface/60'
            : 'card card-hover')
      }
    >
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <CountUp
        value={value}
        format={fmt}
        className="figure mt-1.5 block text-2xl font-semibold text-ink"
      />
      <div className="mt-1 text-xs text-faint">{sub}</div>
      {bar != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(bar, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
