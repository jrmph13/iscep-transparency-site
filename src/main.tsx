import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './fonts/fonts.css' // self-hosted typefaces (Inter + Brunson + Bebas Neue + Jersey 716)
import './index.css'
import { FEATURES } from './data/site'
import { ADMIN_PATH } from './lib/router'

// Tier B — casual anti-inspection deterrent on public pages only. Skipped in
// dev (initDeterrence is a no-op under import.meta.env.DEV) and on the admin
// console (which needs DevTools). See src/lib/deterrence.ts — it is friction,
// not a security control. Fails silently on any error.
if (FEATURES.clientHardening) {
  const onAdmin =
    (location.hash + ' ' + location.pathname)
      .toLowerCase()
      .includes(ADMIN_PATH)
  if (!onAdmin) {
    import('./lib/deterrence')
      .then((m) =>
        m.initDeterrence({
          onSignal: (kind) => {
            // Best-effort beacon. Never awaited, never blocks, never throws
            // out — 4xx/5xx responses are ignored. Comment the try/catch
            // below if you do not run a /api/_sig endpoint yet.
            try {
              navigator.sendBeacon(
                '/api/_sig',
                JSON.stringify({ kind, ua: navigator.userAgent })
              )
            } catch {
              /* no-op */
            }
          },
        })
      )
      .catch(() => {})
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
