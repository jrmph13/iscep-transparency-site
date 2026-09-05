import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '../data/site'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      if (window.turnstile) return resolve()
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      s.defer = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Turnstile script failed to load'))
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

/**
 * Cloudflare Turnstile widget — no-op (renders nothing, `onToken` never
 * fires) unless VITE_TURNSTILE_SITE_KEY is set. See TURNSTILE_SITE_KEY in
 * src/data/site.ts and TX_TURNSTILE_SECRET in apps-script/Code.gs.
 *
 * Tokens are single-use server-side, so bump `resetKey` after each lookup
 * (success or failure) to get a fresh one for the next attempt.
 */
export function Turnstile({
  onToken,
  resetKey,
}: {
  onToken: (token: string) => void
  resetKey?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  // Keep the latest callback without re-rendering the widget on every parent render.
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        })
      })
      .catch(() => {
        /* Blocked / offline — leave onToken uncalled; the caller's gate stays
           closed rather than silently letting the request through. */
      })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
    }
    // Widget is rendered once per mount; resetKey below handles re-verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (resetKey != null && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current)
    }
    // Skip the initial mount — only reset on a resetKey *change*.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={ref} />
}
