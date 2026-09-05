import { num, peso } from '../lib/format'
import type { FundUsage, Summary } from '../types'
import { Section } from './Section'

function shortDate(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime())
    ? s || '—'
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function FlowTile({
  label,
  value,
  dot,
  tone,
  sign,
}: {
  label: string
  value: number
  dot?: string
  tone?: 'brand'
  sign?: string
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
      <div className="stat mt-0.5 text-2xl text-ink">
        {sign && <span className="text-dim">{sign}</span>}
        {peso(value)}
      </div>
    </div>
  )
}

export function FundStatus({ summary, usage }: { summary: Summary; usage: FundUsage[] }) {
  const recent = summary.recent ?? []
  const maxCashier = Math.max(1, ...summary.byCashier.map((c) => c.collected))
  const spentTotal = usage.reduce((a, u) => a + u.used, 0)

  const payments = summary.membershipCollected ?? summary.totalCollected
  const h2go = summary.h2goCollected ?? 0
  const spent = summary.spent ?? spentTotal
  const remaining = summary.remainingFunds ?? Math.max(payments + h2go - spent, 0)
  const inflow = Math.max(payments + h2go, 1)

  return (
    <Section
      id="funds"
      title="Fund status"
      subtitle="Who collected the payments, what was spent, and the latest entries."
    >
      {/* Fund flow: student payments + H2Go − budget used = remaining */}
      <div className="card mb-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="kicker">Fund flow</span>
          <span className="figure text-[11px] text-dim">
            {peso(payments)} + {peso(h2go)} &minus; {peso(spent)} = {peso(remaining)}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FlowTile label="Student payments" value={payments} dot="bg-brand-500" />
          <FlowTile label="H2Go collections" value={h2go} dot="bg-sky-500" />
          <FlowTile label="Budget used" value={spent} dot="bg-amber-500" sign="−" />
          <FlowTile label="Remaining" value={remaining} tone="brand" />
        </div>
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-brand-500"
            style={{ width: `${(payments / inflow) * 100}%` }}
            title={`Student payments ${peso(payments)}`}
          />
          <div
            className="h-full bg-sky-500"
            style={{ width: `${(h2go / inflow) * 100}%` }}
            title={`H2Go ${peso(h2go)}`}
          />
        </div>
        <p className="mt-2 text-[11px] text-dim">
          Inflow {peso(payments + h2go)} · {((remaining / inflow) * 100).toFixed(1)}% still on hand.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Cashier breakdown */}
        <div className="card flex flex-col p-5">
          <div className="kicker">Collected by cashier</div>
          <ul className="mt-4 space-y-3">
            {summary.byCashier.map((c) => (
              <li key={c.cashier}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{c.cashier}</span>
                  <span className="figure text-ink">{peso(c.collected)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
                      style={{ width: `${(c.collected / maxCashier) * 100}%` }}
                    />
                  </div>
                  <span className="figure w-16 shrink-0 text-right text-xs text-dim">
                    {num(c.count)} rcpts
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div>
              <div className="label">Total collected</div>
              <div className="stat mt-0.5 text-2xl text-ink">
                {peso(summary.totalCollected)}
              </div>
            </div>
            <div>
              <div className="label">Contributors</div>
              <div className="stat mt-0.5 text-2xl text-ink">
                {num(summary.contributors)}
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity — anonymised */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="kicker">Recent activity</span>
            <span className="text-[11px] text-dim">last {recent.length} logged</span>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-dim">Nothing logged with a timestamp yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600/10 font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                      {r.section || '—'}
                    </span>
                    <span className="text-sm text-muted">Payment recorded</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="figure text-sm font-medium text-ink">
                      {r.amount ? peso(r.amount) : '—'}
                    </div>
                    <div className="text-xs text-dim">{shortDate(r.date)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-dim">
            No names or receipt numbers — check your own in the Records section.
          </p>
        </div>
      </div>

      {/* Where the money went */}
      {usage.length > 0 && (
        <div className="card mt-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="kicker">Where the money went</span>
            <span className="figure text-xs text-faint">{peso(spentTotal)} spent · {usage.length} items</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="py-2 pr-4 font-medium">Project / purpose</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Used</th>
                  <th className="py-2 font-medium">Authorised by</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-4 text-ink">
                      {u.project || u.purpose || '—'}
                      {u.project && u.purpose && (
                        <span className="block text-xs text-dim">{u.purpose}</span>
                      )}
                    </td>
                    <td className="figure py-2.5 pr-4 text-muted">{u.date || '—'}</td>
                    <td className="figure py-2.5 pr-4 text-ink">
                      {peso(u.used)}
                      {u.estimated > 0 && (
                        <span className="block text-xs text-dim">est. {peso(u.estimated)}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-muted">{u.by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  )
}
