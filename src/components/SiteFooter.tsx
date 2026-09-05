import { ORG, OFFICERS } from '../data/site'
import type { Meta } from '../types'
import { fullDate, relativeTime } from '../lib/format'
import { Logo } from './Logo'

const JUMP = [
  { href: '#overview', label: 'Overview' },
  { href: '#funds', label: 'Fund status' },
  { href: '#sections', label: 'By section' },
  { href: '#announcements', label: 'Announcements' },
  { href: '#records', label: 'Records & lookup' },
  { href: '#faq', label: 'FAQ' },
]

export function SiteFooter({ meta }: { meta: Meta }) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-line bg-canvas">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1.1fr]">
        {/* Brand + human note */}
        <div>
          <div className="flex items-center gap-2 text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/15 text-brand-600 ring-1 ring-brand-500/40 dark:text-brand-400">
              <Logo className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-bold">{ORG.name} Transparency</span>
          </div>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-dim">
            {ORG.fullName}.
          </p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-dim">
            This page exists so every member can see where the money is without having to ask. The
            figures mirror the auditor&rsquo;s receipt sheet and refresh about every 30 minutes — so a
            very recent payment might not show up yet.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-dim">
            Spotted something off?{' '}
            <a
              href={`mailto:${ORG.contactEmail}`}
              className="font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Message the auditor
            </a>{' '}
            with your receipt number and we&rsquo;ll check the entry.
          </p>
        </div>

        {/* Jump to */}
        <nav className="text-xs" aria-label="Footer">
          <div className="font-medium text-muted">Jump to</div>
          <ul className="mt-2 space-y-1.5 text-dim">
            {JUMP.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-brand-700 dark:hover:text-brand-300">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Links */}
        <div className="text-xs">
          <div className="font-medium text-muted">Elsewhere</div>
          <ul className="mt-2 space-y-1.5 text-dim">
            <li>
              <a
                href={ORG.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-700 dark:hover:text-brand-300"
              >
                Facebook page
              </a>
            </li>
            <li>
              <a
                href={`mailto:${ORG.contactEmail}`}
                className="hover:text-brand-700 dark:hover:text-brand-300"
              >
                Contact the auditor
              </a>
            </li>
            <li>
              <a href="#records" className="hover:text-brand-700 dark:hover:text-brand-300">
                Check my own record
              </a>
            </li>
            <li>
              <a href="#about" className="hover:text-brand-700 dark:hover:text-brand-300">
                Security &amp; integrity
              </a>
            </li>
          </ul>
        </div>

        {/* Accountability */}
        <div className="text-xs">
          <div className="font-medium text-muted">Accountable for these funds</div>
          <ul className="mt-2 space-y-2 text-dim">
            {OFFICERS.map((o) => (
              <li key={o.role}>
                <div className="text-muted">{o.name}</div>
                <div className="leading-snug text-dim">{o.role}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-[11px] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            {ORG.copyright.replace(/©\s*\d{4}/, `© ${year}`)}
          </span>
          <span className="figure" title={fullDate(meta.fetchedAt)}>
            Data synced {relativeTime(meta.fetchedAt)}
          </span>
          <span className="flex items-center gap-3">
            <span>Unofficial mirror · not a receipt · verify with the auditor</span>
            <a href="#top" className="hover:text-brand-700 dark:hover:text-brand-300">
              Back to top ↑
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
