import { useEffect, useRef, useState } from 'react'
import { ORG } from '../data/site'

/**
 * Official Facebook Page Plugin. Facebook renders the posts + photos itself
 * inside this iframe. The iframe is always light, so it sits in a plain white
 * frame that looks intentional in both themes.
 */
export function FacebookEmbed() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(400)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(Math.min(Math.max(el.clientWidth, 180), 500))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const src =
    'https://www.facebook.com/plugins/page.php?' +
    new URLSearchParams({
      href: ORG.facebookUrl,
      tabs: 'timeline',
      width: String(width),
      height: '720',
      smallheader: 'true',
      adapt_container_width: 'true',
      hide_cover: 'true',
      show_facepile: 'false',
    }).toString()

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#1877F2]" fill="currentColor">
            <path d="M13 22v-8h2.7l.4-3.1H13V8.9c0-.9.3-1.5 1.6-1.5H16.2V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7v3.1h2.8V22H13z" />
          </svg>
          Facebook posts
        </span>
        <a
          href={ORG.facebookUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-faint hover:text-ink"
        >
          Open page ↗
        </a>
      </div>

      <div ref={wrapRef} className="border-t border-line bg-white p-1">
        {failed ? (
          <p className="p-5 text-sm text-slate-600">
            The feed didn&rsquo;t load here.{' '}
            <a href={ORG.facebookUrl} target="_blank" rel="noreferrer" className="text-[#1877F2]">
              See the posts on Facebook ↗
            </a>
          </p>
        ) : (
          <iframe
            key={width}
            title="ISCEP Facebook posts"
            src={src}
            width={width}
            height={720}
            style={{ border: 'none', overflow: 'hidden', width: '100%', display: 'block' }}
            scrolling="no"
            frameBorder={0}
            allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  )
}
