import { useEffect, useState } from 'react'

/**
 * Tiny hash-first router. No dependency, works on GitHub Pages from any
 * sub-path with no server config.
 *
 *   #/payments/studentid/2026-12345   → { name: 'lookup', id: '2026-12345' }
 *   anything else                      → { name: 'home' }
 *
 * (A legacy `?ln=` query is ignored — lookup is by student number only.)
 *
 * A directly-typed or shared path like `/payments/studentid/2026-12345`
 * is converted to the hash form by public/404.html (GitHub Pages) or the
 * SPA rewrite in vercel.json.
 */
export type Route =
  | { name: 'home' }
  | { name: 'lookup'; id: string }
  | { name: 'admin' }

/**
 * Obscure, hard-to-guess entry to the admin console. This is only a soft gate —
 * real protection is Firebase Auth + the /admins/{uid} check in firestore.rules.
 *   #/iscep/org/admin/user/admin/login/gn8febivdfds
 */
export const ADMIN_PATH = '/iscep/org/admin/user/admin/login/gn8febivdfds'

function parse(): Route {
  const src = location.hash.startsWith('#/') ? location.hash.slice(1) : location.pathname
  if (src.replace(/\/+$/, '').toLowerCase().endsWith(ADMIN_PATH)) return { name: 'admin' }
  const m = src.match(/\/payments\/studentid\/([^/?#]+)/i)
  if (m && m[1]) {
    return { name: 'lookup', id: decodeURIComponent(m[1]).trim() }
  }
  return { name: 'home' }
}

export function paymentPath(studentId: string) {
  return '#/payments/studentid/' + encodeURIComponent(studentId.trim())
}

export function navigate(to: string) {
  if (to.startsWith('#')) {
    if (location.hash === to) window.dispatchEvent(new Event('hashchange'))
    else location.hash = to
  } else {
    history.pushState(null, '', to)
    window.dispatchEvent(new Event('popstate'))
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const update = () => setRoute(parse())
    window.addEventListener('hashchange', update)
    window.addEventListener('popstate', update)
    return () => {
      window.removeEventListener('hashchange', update)
      window.removeEventListener('popstate', update)
    }
  }, [])
  return route
}
