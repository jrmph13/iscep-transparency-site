import { useEffect, useState } from 'react'
import { ORG } from '../data/site'
import { Logo } from './Logo'
import { useTheme } from '../lib/useTheme'
import { firebaseEnabled } from '../lib/firebase'

const LINKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'funds', label: 'Fund status' },
  { id: 'sections', label: 'Sections' },
  ...(firebaseEnabled ? [{ id: 'members', label: 'Members' }] : []),
  { id: 'announcements', label: 'Announcements' },
  { id: 'records', label: 'Records' },
  { id: 'about', label: 'About' },
]

export function Nav() {
  const [active, setActive] = useState('overview')
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.1, 0.5, 1] }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#top" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-600 ring-1 ring-brand-500/40 dark:text-brand-400">
            <Logo className="h-5 w-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-sm font-bold tracking-wide text-ink">
              {ORG.name} <span className="font-body font-normal text-faint">Transparency</span>
            </span>
            <span className="hidden text-[11px] text-dim sm:block">Official fund board</span>
          </span>
        </a>

        <nav className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={
                'relative rounded-lg px-2.5 py-2 text-[13px] transition-colors lg:px-3 lg:text-sm ' +
                (active === l.id ? 'text-ink' : 'text-faint hover:text-ink')
              }
            >
              {l.label}
              {active === l.id && (
                <span className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-brand-500 lg:inset-x-3" />
              )}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-faint transition-colors hover:bg-surface2 hover:text-ink"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <a
            href={ORG.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-600/10 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-600/20 dark:text-brand-300 sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M13 22v-8h2.7l.4-3.1H13V8.9c0-.9.3-1.5 1.6-1.5H16.2V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7v3.1h2.8V22H13z" />
            </svg>
            Facebook
          </a>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-faint hover:bg-surface2 hover:text-ink md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-line bg-canvas px-4 pb-3 pt-2 md:hidden">
          <div className="grid grid-cols-2 gap-1">
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={() => setOpen(false)}
                className={
                  'rounded-lg px-3 py-2.5 text-sm ' +
                  (active === l.id
                    ? 'bg-brand-600/10 font-medium text-brand-700 dark:text-brand-300'
                    : 'text-muted hover:bg-surface2')
                }
              >
                {l.label}
              </a>
            ))}
          </div>
          <a
            href={ORG.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block rounded-lg border border-line px-3 py-2.5 text-center text-sm text-muted hover:bg-surface2"
          >
            Open Facebook page ↗
          </a>
        </nav>
      )}
    </header>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  )
}
