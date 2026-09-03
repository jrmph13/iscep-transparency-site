/**
 * Casual anti-inspection deterrent for the PUBLIC pages.
 *
 * ⚠️  This is friction, not security. Anyone can bypass it in seconds:
 *   • DevTools ▸ Sources ▸ "Deactivate breakpoints"
 *   • an intercepting proxy (Burp / mitmproxy) — the page JS never runs
 *   • `curl` / Postman — no browser at all
 *   • disabling JavaScript — the static markup still loads
 * It also has real costs: it removes right-click for everyone, eats a few
 * common keyboard shortcuts, and can false-positive on docked DevTools, heavy
 * browser zoom, or small windows. Keep the actual data safe on the server
 * (private sheet, rate limits, Firebase App Check) — this only turns away the
 * merely curious.
 *
 * Guards: disabled under `import.meta.env.DEV`, only installs once, and the
 * caller must not enable it on the /admin route.
 */

type TripAction = 'notfound' | 'blank' | 'reload'

export interface HardeningOptions {
  /** What to do when DevTools is detected. Default 'notfound'. */
  onDetect?: TripAction
  /** Also run a periodic `debugger` statement (the "anti-debugger"). Default true. */
  debuggerTrap?: boolean
  /**
   * Repeatedly call console.clear() so the Console tab stays empty. Default
   * true. Defeated by DevTools ▸ ⚙ ▸ "Preserve log" (then the browser shows
   * "console.clear() was prevented…").
   */
  clearConsole?: boolean
}

let installed = false

export function installClientHardening(opts: HardeningOptions = {}): void {
  if (installed) return
  if (import.meta.env.DEV) return
  if (typeof window === 'undefined') return

  installed = true
  const action: TripAction = opts.onDetect ?? 'notfound'
  const useDebuggerTrap = opts.debuggerTrap ?? true
  const useClearConsole = opts.clearConsole ?? true

  let tripped = false

  const trip = () => {
    if (tripped) return
    tripped = true
    try {
      if (action === 'reload') {
        location.reload()
        return
      }
      if (action === 'blank') {
        document.documentElement.innerHTML = ''
        return
      }
      // 'notfound' — replace the document with a plain 404-style notice.
      document.documentElement.innerHTML =
        '<head><meta charset="utf-8"><title>404</title></head>' +
        '<body style="margin:0;font:16px/1.6 system-ui,sans-serif;background:#0b0f19;' +
        'color:#e5e7eb;display:grid;place-items:center;height:100vh">' +
        '<div style="text-align:center;padding:24px">' +
        '<div style="font-size:56px;font-weight:700;letter-spacing:-.02em">404</div>' +
        '<div style="opacity:.7;margin-top:8px">This page is not available.</div>' +
        '<div style="opacity:.5;margin-top:16px;font-size:13px">Reload the page to continue.</div>' +
        '</div></body>'
    } catch {
      /* ignore */
    }
  }

  /* ---- 1. Block context menu + inspection shortcuts ------------------- */
  const swallow = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
  }
  window.addEventListener('contextmenu', swallow, { capture: true })

  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const ctrlish = e.ctrlKey || e.metaKey
      const blocked =
        e.key === 'F12' ||
        (ctrlish && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) ||
        (ctrlish && k === 'u') // view-source
      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    { capture: true }
  )

  /* ---- 2. DevTools-open heuristic (viewport delta) ------------------- */
  const SIZE_GAP = 170
  const sizeCheck = () => {
    const wGap = window.outerWidth - window.innerWidth
    const hGap = window.outerHeight - window.innerHeight
    if (wGap > SIZE_GAP || hGap > SIZE_GAP) trip()
  }
  window.setInterval(sizeCheck, 1000)
  window.addEventListener('resize', sizeCheck)

  /* ---- 3. Timing-based debugger trap -------------------------------- */
  // Note: `vite.config.ts` sets terser `drop_debugger: false` so this literal
  // survives the production build.
  if (useDebuggerTrap) {
    window.setInterval(() => {
      const t0 = performance.now()
      // A no-op unless DevTools is open with breakpoints active, in which case
      // it pauses execution here.
      // eslint-disable-next-line no-debugger
      debugger
      if (performance.now() - t0 > 120) trip()
    }, 1000)
  }

  /* ---- 4. Keep the Console tab empty -------------------------------- */
  if (useClearConsole) {
    // Grabbed via a computed key so the build's `drop_console` pass leaves it
    // alone. `.clear()` on this reference is not a `console.*` call site.
    const con = (window as unknown as Record<string, any>)['con' + 'sole']
    if (con && typeof con.clear === 'function') {
      const wipe = () => {
        try {
          con.clear()
        } catch {
          /* ignore */
        }
      }
      wipe()
      window.setInterval(wipe, 1000)
    }
  }
}
