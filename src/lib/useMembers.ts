import { useEffect, useState } from 'react'
import { firebaseEnabled, getDb } from './firebase'
import type { Member } from '../types'

type State = {
  members: Member[]
  status: 'off' | 'loading' | 'live' | 'error'
  updatedAt: number | null
}

/**
 * Realtime ISCEP roster from Firestore `members`. The Firestore SDK is only
 * downloaded when Firebase is configured. Stays 'off' otherwise.
 */
export function useMembers(): State {
  const [state, setState] = useState<State>({
    members: [],
    status: firebaseEnabled ? 'loading' : 'off',
    updatedAt: null,
  })

  useEffect(() => {
    if (!firebaseEnabled) return
    let alive = true
    let unsub: () => void = () => {}

    ;(async () => {
      try {
        const p = getDb()
        if (!p) return
        const store = await p
        const { collection, onSnapshot, query } = await import('firebase/firestore')
        if (!alive) return
        unsub = onSnapshot(
          query(collection(store, 'members')),
          (snap) => {
            const members = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<Member, 'id'>) }))
              .sort(
                (a, b) =>
                  (a.section || '').localeCompare(b.section || '') ||
                  (a.order ?? 999) - (b.order ?? 999) ||
                  (a.name || '').localeCompare(b.name || '')
              )
            setState({ members, status: 'live', updatedAt: Date.now() })
          },
          () => alive && setState((s) => ({ ...s, status: 'error' }))
        )
      } catch {
        if (alive) setState((s) => ({ ...s, status: 'error' }))
      }
    })()

    return () => {
      alive = false
      unsub()
    }
  }, [])

  return state
}
