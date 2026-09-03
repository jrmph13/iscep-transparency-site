import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { num, safeExternalUrl } from '../lib/format'
import { useMembers } from '../lib/useMembers'
import { roleRank } from '../lib/roles'
import type { Member } from '../types'
import { Section } from './Section'

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Members() {
  const { members, status } = useMembers()
  const [active, setActive] = useState<Member | null>(null)

  const officers = useMemo(
    () =>
      members
        .filter((m) => m.role && m.role !== 'Member')
        .sort((a, b) => roleRank(a.role) - roleRank(b.role)),
    [members]
  )

  // Don't show the section until it is actually working with data.
  if (status === 'off' || status === 'error') return null
  if (status === 'live' && officers.length === 0) return null

  return (
    <Section
      id="members"
      title="Members"
      subtitle="The ISCEP roster — updates the moment the auditor changes it."
      action={
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-faint">
          <span
            className={
              'h-1.5 w-1.5 rounded-full ' + (status === 'live' ? 'bg-emerald-500' : 'bg-amber-500')
            }
          />
          {status === 'live' ? `Live · ${num(members.length)} members` : 'Connecting…'}
        </span>
      }
    >
      {status === 'loading' && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      )}

      {officers.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {officers.map((m) => (
            <MemberCard key={m.id} m={m} highlight onClick={() => setActive(m)} />
          ))}
        </div>
      )}

      {active && <MemberModal m={active} onClose={() => setActive(null)} />}
    </Section>
  )
}

function MemberCard({
  m,
  highlight,
  onClick,
}: {
  m: Member
  highlight?: boolean
  onClick?: () => void
}) {
  const isOfficer = !!m.role && m.role !== 'Member'
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ' +
        'hover:border-brand-500/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ' +
        (highlight ? 'border-brand-500/30 bg-brand-600/[0.06]' : 'border-line bg-surface')
      }
    >
      {m.photoUrl ? (
        <img
          src={m.photoUrl}
          alt=""
          loading="lazy"
          className="h-10 w-9 shrink-0 rounded-lg object-cover ring-1 ring-line"
        />
      ) : (
        <span
          className={
            'grid h-10 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold ring-1 ' +
            (highlight
              ? 'bg-brand-600/15 text-brand-700 ring-brand-500/30 dark:text-brand-300'
              : 'bg-surface2 text-faint ring-line')
          }
        >
          {initials(m.name) || '—'}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{m.name}</div>
        <div className="truncate text-xs text-faint">
          {isOfficer ? (
            <span className="text-brand-600 dark:text-brand-400">{m.role}</span>
          ) : null}
          {isOfficer && m.section ? ' · ' : ''}
          {m.section}
        </div>
      </div>
    </button>
  )
}

function MemberModal({ m, onClose }: { m: Member; onClose: () => void }) {
  const isOfficer = !!m.role && m.role !== 'Member'
  const cleanLink = m.link ? m.link.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Portal to <body> — the Members section sits inside a `transform`ed <Reveal>
  // wrapper, which would otherwise trap this fixed overlay and clip it.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={m.name}
      onClick={onClose}
      className="animate-overlay fixed inset-0 z-[70] overflow-y-auto bg-navy-950/75 backdrop-blur-md"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-pop relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        >
        {/* header band */}
        <div className="h-28 bg-gradient-to-br from-brand-700 via-brand-500 to-sky-500">
          <div className="h-full w-full bg-grid-fade opacity-40 [background-size:16px_16px]" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* body */}
        <div className="relative z-10 -mt-16 flex flex-col items-center px-6 pb-6 text-center">
          {m.photoUrl ? (
            <img
              src={m.photoUrl}
              alt={m.name}
              className="h-28 w-28 rounded-2xl object-cover shadow-lg ring-4 ring-surface"
            />
          ) : (
            <span className="grid h-28 w-28 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-3xl font-bold text-white shadow-lg ring-4 ring-surface">
              {initials(m.name) || '—'}
            </span>
          )}

          <h3 className="mt-3 font-display text-xl font-bold text-ink">{m.name}</h3>
          {isOfficer && (
            <p className="mt-0.5 text-sm font-semibold text-brand-600 dark:text-brand-400">
              {m.role}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {m.section && (
              <span className="rounded-full border border-line bg-surface2/60 px-2.5 py-0.5 text-xs font-medium text-faint">
                Section {m.section}
              </span>
            )}
            <span className="rounded-full border border-line bg-surface2/60 px-2.5 py-0.5 text-xs font-medium text-faint">
              ISCEP {isOfficer ? 'Officer' : 'Member'}
            </span>
          </div>

          <div className="mt-5 w-full space-y-2">
            {m.email ? (
              <a
                href={`mailto:${m.email}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-muted transition hover:border-brand-500/50 hover:text-ink"
              >
                <IconWrap>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </IconWrap>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-dim">
                    Email
                  </span>
                  <span className="mt-0.5 block truncate">{m.email}</span>
                </span>
              </a>
            ) : null}

            {safeExternalUrl(m.link) ? (
              <a
                href={safeExternalUrl(m.link)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-muted transition hover:border-brand-500/50 hover:text-ink"
              >
                <IconWrap>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <path
                      d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </IconWrap>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-dim">
                    Link
                  </span>
                  <span className="mt-0.5 block truncate">{cleanLink}</span>
                </span>
                <svg viewBox="0 0 24 24" className="ml-auto h-3.5 w-3.5 shrink-0 text-dim" fill="none">
                  <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ) : null}

            {!m.email && !m.link && (
              <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-faint">
                No contact details added.
              </p>
            )}
          </div>

          <p className="mt-5 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
            Information Systems for Community Engagement &amp; Professionalism
          </p>
        </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-400">
      {children}
    </span>
  )
}
