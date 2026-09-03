import { num, peso, pct } from '../lib/format'
import type { SectionStat } from '../types'
import { Section } from './Section'

function rateColor(rate: number) {
  if (rate >= 0.66) return 'bg-emerald-500'
  if (rate >= 0.33) return 'bg-amber-500'
  return 'bg-rose-400'
}

export function SectionBreakdown({ sections }: { sections: SectionStat[] }) {
  const totalMembers = sections.reduce((a, s) => a + s.members, 0)
  const totalCollected = sections.reduce((a, s) => a + s.collected, 0)
  const totalContrib = sections.reduce((a, s) => a + s.contributors, 0)
  const totalExpected = sections.reduce((a, s) => a + s.expected, 0)
  const overallRate = totalExpected ? totalCollected / totalExpected : 0

  return (
    <Section
      id="sections"
      no="03"
      title="By year & section"
      subtitle="How much each section has paid, against ₱50 per member."
      action={
        <div className="figure rounded-lg border border-line px-3 py-1.5 text-xs text-faint">
          {num(totalMembers)} members · {peso(totalCollected)}
        </div>
      }
    >
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
              <th className="px-4 py-3 font-medium">Section</th>
              <th className="px-4 py-3 font-medium">Collected / expected</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Contributors</th>
              <th className="px-4 py-3 font-medium">Members</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s.section} className="border-b border-line last:border-0 hover:bg-surface2/60">
                <td className="px-4 py-3 font-mono font-semibold text-ink">{s.section}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-36 shrink-0 overflow-hidden rounded-full bg-line">
                      <div
                        className={
                          'h-full rounded-full transition-[width] duration-700 ease-out ' +
                          rateColor(s.rate)
                        }
                        style={{ width: `${Math.min(s.rate * 100, 100)}%` }}
                      />
                    </div>
                    <span className="figure text-ink">{peso(s.collected)}</span>
                    <span className="figure text-xs text-dim">/ {peso(s.expected)}</span>
                  </div>
                </td>
                <td className="figure px-4 py-3 text-muted">{pct(s.rate)}</td>
                <td className="figure px-4 py-3 text-muted">{num(s.contributors)}</td>
                <td className="figure px-4 py-3 text-muted">{num(s.members)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-surface2/50 font-semibold text-ink">
              <td className="px-4 py-3">All</td>
              <td className="figure px-4 py-3">
                {peso(totalCollected)} <span className="text-xs font-normal text-dim">/ {peso(totalExpected)}</span>
              </td>
              <td className="figure px-4 py-3">{pct(overallRate)}</td>
              <td className="figure px-4 py-3">{num(totalContrib)}</td>
              <td className="figure px-4 py-3">{num(totalMembers)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {sections.map((s) => (
          <div key={s.section} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-ink">{s.section}</span>
              <span className="figure text-sm text-ink">
                {peso(s.collected)} <span className="text-dim">/ {peso(s.expected)}</span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
              <div
                className={'h-full rounded-full ' + rateColor(s.rate)}
                style={{ width: `${Math.min(s.rate * 100, 100)}%` }}
              />
            </div>
            <div className="figure mt-2 flex justify-between text-xs text-dim">
              <span>{pct(s.rate)} collected</span>
              <span>
                {num(s.contributors)} / {num(s.members)} paid
              </span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
