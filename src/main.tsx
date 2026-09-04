import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './fonts/fonts.css' // self-hosted typefaces (Inter + Brunson + Bebas Neue + Jersey 716)
import './index.css'
import { FEATURES } from './data/site'
import { ADMIN_PATH } from './lib/router'

// Casual anti-inspection deterrent on public pages only. Skipped in dev and on
// the admin console (which needs DevTools). See clientHardening.ts — it is
// friction, not a security control.
if (FEATURES.clientHardening) {
  const onAdmin =
    (location.hash + ' ' + location.pathname).toLowerCase().includes(ADMIN_PATH)
  if (!onAdmin) {
    import('./lib/clientHardening')
      .then((m) => m.installClientHardening({ onDetect: 'notfound' }))
      .catch(() => {})
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
