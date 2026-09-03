import { useEffect, useState } from 'react'
import { firebaseEnabled, getDb } from './firebase'
import type { Announcement } from '../types'

type State = {
  items: (Announcement & { id: string })[]
  status: 'off' | 'loading' | 'live' | 'error'
  updatedAt: number | null
}

/**
 * Realtime manual announcements from Firestore `announcements`. Manual
 * announcements are merged on top of the Facebook feed in `AnnouncementsFeed`
 * so admins can pin / override items without touching the build.
 */
export function useAnnouncements(): State {
  const [state, setState] = useState<State>({
    items: [],
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
        const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore')
        if (!alive) return
        unsub = onSnapshot(
          query(collection(store, 'announcements'), orderBy('date', 'desc')),
          (snap) => {
            const items = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Announcement, 'id'>),
              source: 'manual' as const,
            }))
            setState({ items, status: 'live', updatedAt: Date.now() })
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