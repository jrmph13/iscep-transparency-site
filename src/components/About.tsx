import { useMemo, type ReactNode } from 'react'
import { FEE_INFO, OFFICERS, ORG, SECURITY_NOTES } from '../data/site'
import type { Meta, Summary } from '../types'
import { fullDate, num, peso } from '../lib/format'
import { useMembers } from '../lib/useMembers'
import { roleRank } from '../lib/roles'
import { Section } from './Section'
import { Reveal } from './Reveal'

/** Roles shown in the "Accountable officers" panel, if present in the roster. */
const ACCOUNTABLE = new Set([
  'President',
  'Vice President - Internal',
  'Vice President - External',
  'Secretary',
  'Treasurer',
  'Auditor',
  'P.R.O. - Internal',
  'P.R.O. - External',
])

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
}

function Panel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={'card card-hover p-6 ' + className}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-400">
          {icon}
        </span>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export function About({ meta, summary }: { meta: Meta; summary: Summary }) {
  const { members } = useMembers()

  // Prefer the live roster: real people with an accountable role. Falls back to
  // the static OFFICERS list when the roster is empty or Firebase is off.
  const liveOfficers = useMemo(
    () =>
      members
        .filter((m) => m.role && ACCOUNTABLE.has(m.role))
        .sort(
          (a, b) =>
            roleRank(a.role) - roleRank(b.role) || (a.name || '').localeCompare(b.name || '')
        ),
    [members]
  )

  return (
    <Section
      id="about"
      title="About this board"
      subtitle="What this page is and where the numbers come from."
    >
      <Reveal stagger className="grid items-start gap-3 lg:grid-cols-2">
        <Panel
          title="Where the numbers come from"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          }
        >
          <p className="text-sm leading-relaxed text-muted">
            Every figure is read from the <strong className="text-ink">{ORG.sheetLabel}</strong>{' '}
            spreadsheet maintained by the ISCEP auditor. A scheduled job re-reads the sheet every 30
            minutes and republishes this page.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><Dot /> “Collected” = sum of the amount column across all {num(summary.totalMembers)} receipts.</li>
            <li className="flex gap-2"><Dot /> “Remaining funds” = the figure on the funds tab of the same sheet.</li>
            <li className="flex gap-2"><Dot /> “Expected” assumes {peso(summary.perMemberFee)} membership fee per member.</li>
            <li className="flex gap-2"><Dot /> Dispute a figure? Message the auditor with your receipt number.</li>
          </ul>
          <div className="mt-5 border-t border-line pt-4 text-xs text-dim">
            <span className="figure">Last sync: {fullDate(meta.fetchedAt)}</span>
            <p className="mt-1">
              The source sheet holds student details, so it is kept private. Questions about a figure
              go to the auditor.
            </p>
          </div>
        </Panel>

        <Panel
          title="Accountable officers"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
        >
          <p className="text-sm text-faint">{ORG.fullName}</p>
          <ul className="mt-4 space-y-3">
            {liveOfficers.length > 0
              ? liveOfficers.map((m) => (
                  <li key={m.id} className="flex items-start gap-3">
                    {m.photoUrl ? (
                      <img
                        src={m.photoUrl}
                        alt=""
                        loading="lazy"
                        className="mt-0.5 h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-brand-500/30"
                      />
                    ) : (
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/15 text-xs font-semibold text-brand-700 ring-1 ring-brand-500/30 dark:text-brand-300">
                        {initials(m.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink">{m.name}</div>
                      <div className="text-xs text-brand-600 dark:text-brand-400">{m.role}</div>
                      {m.section && <div className="text-xs text-faint">{m.section}</div>}
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className="figure text-xs text-dim hover:text-ink"
                        >
                          {m.email}
                        </a>
                      )}
                    </div>
                  </li>
                ))
              : OFFICERS.map((o) => (
                  <li key={o.role} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/15 text-xs font-semibold text-brand-700 ring-1 ring-brand-500/30 dark:text-brand-300">
                      {initials(o.name)}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-ink">{o.name}</div>
                      <div className="text-xs text-faint">{o.role}</div>
                      {o.handle && <div className="figure text-xs text-dim">@{o.handle}</div>}
                    </div>
                  </li>
                ))}
          </ul>
          <a
            href={`mailto:${ORG.contactEmail}`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {ORG.contactEmail}
          </a>
        </Panel>
      </Reveal>

      <Panel
        className="mt-3"
        title="What the collections are for"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEE_INFO.map((f) => (
            <div key={f.key} className="rounded-xl border border-line bg-surface2/50 p-3">
              <div className="text-sm font-medium text-ink">{f.label}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-faint">{f.desc}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Security & integrity */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-brand-500/25 bg-gradient-to-br from-brand-600/[0.08] to-transparent p-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/15 text-brand-600 dark:text-brand-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M12 3l7 3v5c0 4.5-3 8.4-7 9.5C8 19.4 5 15.5 5 11V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3 className="font-display text-base font-semibold text-ink">Security &amp; integrity</h3>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {SECURITY_NOTES.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" fill="none">
                <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

function Dot() {
  return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
}
