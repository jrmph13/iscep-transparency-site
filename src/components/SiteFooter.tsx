import { ORG } from '../data/site'
import type { Meta } from '../types'
import { fullDate } from '../lib/format'
import { Logo } from './Logo'

export function SiteFooter({ meta }: { meta: Meta }) {
  return (
    <footer className="mt-20 border-t border-line bg-canvas">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600/15 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500/40">
              <Logo className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-bold">{ORG.name} Transparency</span>
          </div>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-dim">
            {ORG.fullName}. Fund board for members — the numbers follow the auditor's records and can
            be up to 30 minutes behind.
          </p>
        </div>

        <div className="text-xs">
          <div className="font-medium text-muted">Jump to</div>
          <ul className="mt-2 space-y-1.5 text-dim">
            <li><a href="#overview" className="hover:text-brand-700 dark:hover:text-brand-300">Overview</a></li>
            <li><a href="#funds" className="hover:text-brand-700 dark:hover:text-brand-300">Fund status</a></li>
            <li><a href="#sections" className="hover:text-brand-700 dark:hover:text-brand-300">Sections</a></li>
            <li><a href="#records" className="hover:text-brand-700 dark:hover:text-brand-300">Records</a></li>
          </ul>
        </div>

        <div className="text-xs">
          <div className="font-medium text-muted">Links</div>
          <ul className="mt-2 space-y-1.5 text-dim">
            <li>
              <a href={ORG.facebookUrl} target="_blank" rel="noreferrer" className="hover:text-brand-700 dark:hover:text-brand-300">
                Facebook page
              </a>
            </li>
            <li><a href={`mailto:${ORG.contactEmail}`} className="hover:text-brand-700 dark:hover:text-brand-300">Contact auditor</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 text-[11px] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="figure">Data synced {fullDate(meta.fetchedAt)}</span>
          <span>Unofficial mirror · not a receipt · verify with the auditor</span>
        </div>
      </div>
    </footer>
  )
}
