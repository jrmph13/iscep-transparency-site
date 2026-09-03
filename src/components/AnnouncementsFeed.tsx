import { useState } from 'react'
import { ANNOUNCEMENTS, FEATURES, ORG } from '../data/site'
import type { Announcement, AnnouncementsFile } from '../types'
import { relativeTime } from '../lib/format'
import { useAnnouncements } from '../lib/useAnnouncements'
import { Section } from './Section'
import { FacebookEmbed } from './FacebookEmbed'

const BASE = import.meta.env.BASE_URL || '/'

function dateLabel(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolveImg(src?: string) {
  if (!src) return undefined
  // Absolute http(s) or a raster data: URL only. `data:text/html` and
  // `data:image/svg+xml` (script-capable) are rejected.
  if (/^(https?:)?\/\//.test(src)) return src
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src)) return src
  if (src.startsWith('data:')) return undefined
  return BASE + src.replace(/^\/+/, '')
}

/** An external link is safe to use as an href only if it is http(s). */
function safeLink(src?: string) {
  return src && /^https?:\/\//i.test(src) ? src : undefined
}

const TAG_STYLE: Record<string, string> = {
  Funds: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Event: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Notice: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Update: 'border-brand-500/30 bg-brand-600/10 text-brand-700 dark:text-brand-300',
}

const ExternalIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M7 17L17 7M17 7H9M17 7v8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function AnnouncementsFeed({ feed }: { feed: AnnouncementsFile | null }) {
  const manual = useAnnouncements()
  const auto = feed && feed.items.length > 0
  // Manual (admin-posted) items appear first so they aren't buried under the
  // Facebook feed. De-dup by link/title+date just in case.
  const fbItems: Announcement[] = auto ? feed!.items : ANNOUNCEMENTS
  const all: Announcement[] = [
    ...manual.items,
    ...fbItems.filter(
      (f: Announcement) =>
        !manual.items.some(
          (m: Announcement) =>
            (m.link && m.link === f.link) || (m.title === f.title && m.date === f.date)
        )
    ),
  ]
  const items = [...all].sort((a, b) => b.date.localeCompare(a.date))
  const withEmbed = FEATURES.facebookEmbed

  return (
    <Section
      id="announcements"
      no="04"
      title="Announcements"
      subtitle={
        auto && feed!.fetchedAt
          ? `Synced from the ISCEP Facebook page ${relativeTime(feed!.fetchedAt)}.`
          : 'Updates from the ISCEP Facebook page.'
      }
      action={
        <a
          href={ORG.facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface2"
        >
          Facebook page <ExternalIcon />
        </a>
      }
    >
      <div className={withEmbed ? 'grid gap-6 lg:grid-cols-[1fr_400px]' : ''}>
        <div className={withEmbed ? '' : 'max-w-3xl'}>
          <div className="space-y-4">
            {items.map((a, i) => (
              <Item key={a.link || a.date + i} a={a} />
            ))}
            {items.length === 0 && (
              <p className="card p-6 text-sm text-faint">No announcements posted yet.</p>
            )}
          </div>
        </div>

        {withEmbed && (
          <div className="lg:sticky lg:top-20 lg:self-start">
            <FacebookEmbed />
          </div>
        )}
      </div>
    </Section>
  )
}

function Item({ a }: { a: Announcement }) {
  const [expanded, setExpanded] = useState(false)
  const long = a.body.length > 320
  const img = resolveImg(a.image)
  const link = safeLink(a.link)

  return (
    <article
      className={
        'overflow-hidden rounded-2xl border ' +
        (a.important ? 'border-brand-500/40 bg-brand-600/[0.06]' : 'card')
      }
    >
      {img &&
        (link ? (
          <a href={link} target="_blank" rel="noreferrer" className="block bg-surface2">
            <img src={img} alt="" loading="lazy" className="max-h-[420px] w-full object-cover" />
          </a>
        ) : (
          <div className="block bg-surface2">
            <img src={img} alt="" loading="lazy" className="max-h-[420px] w-full object-cover" />
          </div>
        ))}

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600/10 text-brand-600 dark:text-brand-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M13 22v-8h2.7l.4-3.1H13V8.9c0-.9.3-1.5 1.6-1.5H16.2V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7v3.1h2.8V22H13z" />
            </svg>
          </span>
          <time className="figure text-faint">{dateLabel(a.date)}</time>
          {a.tag && (
            <span className={'rounded-md border px-2 py-0.5 ' + (TAG_STYLE[a.tag] ?? TAG_STYLE.Update)}>
              {a.tag}
            </span>
          )}
          {a.important && (
            <span className="rounded-md border border-brand-400/40 bg-brand-500/20 px-2 py-0.5 text-brand-700 dark:text-brand-200">
              Pinned
            </span>
          )}
        </div>

        <h3 className="mt-2.5 font-display text-base font-semibold text-ink">{a.title}</h3>

        <p
          className={
            'mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted ' +
            (long && !expanded ? 'line-clamp-5' : '')
          }
        >
          {a.body}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {long && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-faint hover:text-ink"
            >
              See on Facebook <ExternalIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
