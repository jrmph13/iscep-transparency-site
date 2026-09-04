/**
 * Tier B — Casual-copycat deterrence.
 *
 * ⚠️  NOT a security control. Trivially bypassed by anyone who knows what
 *    they're doing:
 *      • DevTools ▸ Sources ▸ "Deactivate breakpoints"
 *      • an intercepting proxy (Burp / mitmproxy) — the page JS never runs
 *      • `curl` / Postman — no browser at all
 *      • disabling JavaScript — the static markup still loads
 *
 * Design rules (from the hardening spec):
 *   1. No `debugger` statements.
 *   2. No infinite loops or busy polling.
 *   3. Never `preventDefault` on keys that matter for accessibility
 *      (Tab, Enter, Space, arrow keys, Escape, function keys other than F12).
 *   4. Never blank / reload / redirect the page on detection.
 *   5. Fails silently — a runtime error here behaves like the normal path.
 *   6. No-op in dev (`import.meta.env.DEV`) and behind an opt-out.
 *
 * On any failure the page keeps working exactly as before — that's the point.
 */

type SignalKind =
  | 'contextmenu'
  | `hotkey:${string}`
  | 'devtools_open'

export interface DeterrenceOptions {
  /** Best-effort telemetry callback. Never awaited. */
  onSignal?: (kind: SignalKind) => void
}

function optOut(): boolean {
  if (typeof window === 'undefined') return true
  try {
    if (new URLSearchParams(window.location.search).has('debug')) return true
    if (window.localStorage?.getItem('allow_devtools') === '1') return true
  } catch {
    /* localStorage can throw in private mode / sandboxed iframes */
  }
  return false
}

let installed = false

/**
 * Install the prod-only deterrence hooks. Safe to call multiple times — only
 * the first call has effect.
 */
export function initDeterrence(opts: DeterrenceOptions = {}): void {
  if (installed) return
  if (!import.meta.env.PROD) return
  if (typeof window === 'undefined') return
  if (optOut()) return

  installed = true
  const onSignal = opts.onSignal ?? (() => {})

  try {
    /* ---- 1. Right-click — nag once, don't fully block (a11y/UX) ------- */
    let contextWarned = false
    window.addEventListener(
      'contextmenu',
      () => {
        // We intentionally do NOT preventDefault here: it interferes with
        // assistive tech that uses long-press / right-click for context. Just
        // emit a one-time telemetry signal.
        if (!contextWarned) {
          contextWarned = true
          try {
            onSignal('contextmenu')
          } catch {
            /* swallow */
          }
        }
      },
      { passive: true }
    )

    /* ---- 2. Common devtools / source-viewer hotkeys ------------------ */
    window.addEventListener(
      'keydown',
      (e) => {
        const k = (e.key || '').toUpperCase()
        const ctrlLike = e.ctrlKey || e.metaKey
        const blocked =
          k === 'F12' ||
          (ctrlLike && e.shiftKey && (k === 'I' || k === 'J' || k === 'C')) ||
          (ctrlLike && k === 'U') || // view-source
          (ctrlLike && k === 'S') // save page
        if (blocked) {
          // Only swallow these specific combos. We deliberately leave every
          // other key alone — Tab, Enter, Space, arrows, Escape, modifier
          // shortcuts used by screen readers, etc. all still work.
          e.preventDefault()
          try {
            onSignal(`hotkey:${k}`)
          } catch {
            /* swallow */
          }
        }
      },
      { passive: false }
    )

    /* ---- 3. DevTools-open heuristic — telemetry only, no trip action - */
    let devtoolsFired = false
    const SIZE_GAP = 160
    const check = () => {
      // Docked DevTools on desktop leaves a gap between outer and inner
      // window dimensions. We never blank / reload — we just note it once.
      const wGap = window.outerWidth - window.innerWidth
      const hGap = window.outerHeight - window.innerHeight
      const open = wGap > SIZE_GAP || hGap > SIZE_GAP
      if (open && !devtoolsFired) {
        devtoolsFired = true
        try {
          onSignal('devtools_open')
        } catch {
          /* swallow */
        }
      }
    }
    const intervalId = window.setInterval(check, 1500)
    // Free the timer when the tab is being torn down (mobile / back-button).
    window.addEventListener('pagehide', () => {
      window.clearInterval(intervalId)
    })

    /* ---- 4. Self-XSS console banner ---------------------------------- */
    // Uses `console.error` on purpose: the prod build pure-strips
    // console.log/info/debug/warn (see vite.config.ts esbuild.pure), so those
    // would vanish from the shipped bundle — console.error is the one kept.
    // The Self-XSS risk this warns about is the user pasting attacker code
    // into their own console; near-zero, but the banner costs nothing.
    const big = 'font-size:20px;font-weight:bold;color:#c00'
    // eslint-disable-next-line no-console
    console.error('%cStop.', big)
    // eslint-disable-next-line no-console
    console.error(
      '%cThis is a browser feature intended for developers. ' + 'Do not paste code here.',
      'font-size:13px'
    )
  } catch {
    // Any failure here is non-fatal — the page must keep working normally.
    installed = false // allow a future retry if needed
  }
}