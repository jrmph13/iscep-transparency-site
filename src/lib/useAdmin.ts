import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { getAuthInstance, getDb } from './firebase'

/** Hard-coded super owner — always an admin, sole editor of the whitelist. */
export const OWNER_EMAIL = 'jhamesediting@gmail.com'

export type AdminState = {
  /** 'init' → checking session · 'anon' → signed out · 'checking' → verifying
   *  'ready' → signed-in admin · 'denied' → signed in, not whitelisted · 'error' */
  status: 'init' | 'anon' | 'checking' | 'ready' | 'denied' | 'error'
  user: User | null
  isOwner: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const norm = (s: string | null | undefined) => (s || '').trim().toLowerCase()

/**
 * Google sign-in + whitelist check. The owner e-mail passes unconditionally;
 * everyone else must have a doc at `admins/{their-email}`. Every write still
 * fails closed in the rules regardless of what this hook reports.
 */
export function useAdmin(): AdminState {
  const [status, setStatus] = useState<AdminState['status']>('init')
  const [user, setUser] = useState<User | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  useEffect(() => {
    const p = getAuthInstance()
    if (!p) {
      setStatus('error')
      setError('Firebase is not configured.')
      return
    }
    let unsub = () => {}
    p.then(async (auth) => {
      const { onAuthStateChanged } = await import('firebase/auth')
      unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u)
        const owner = !!u && norm(u.email) === OWNER_EMAIL
        setIsOwner(owner)
        if (!u) {
          setStatus('anon')
          return
        }
        if (owner) {
          setStatus('ready')
          return
        }
        setStatus('checking')
        try {
          const db = await getDb()!
          const { doc, getDoc } = await import('firebase/firestore')
          const snap = await getDoc(doc(db, 'admins', norm(u.email)))
          setStatus(snap.exists() ? 'ready' : 'denied')
        } catch (e) {
          setStatus('denied')
          setError(e instanceof Error ? e.message : 'Could not verify admin access.')
        }
      })
    }).catch((e) => {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Auth failed to load.')
    })
    return () => unsub()
  }, [])

  const signIn = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setError(null)
    try {
      const auth = await getAuthInstance()!
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/popup-closed-by-user|cancelled-popup-request/.test(msg)) setError(msg)
    } finally {
      busy.current = false
    }
  }, [])

  const signOut = useCallback(async () => {
    const auth = await getAuthInstance()!
    const { signOut: fbSignOut } = await import('firebase/auth')
    await fbSignOut(auth)
  }, [])

  return { status, user, isOwner, error, signIn, signOut }
}
