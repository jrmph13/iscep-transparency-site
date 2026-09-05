import { useCallback, useEffect, useState } from 'react'
import announcementsFile from '../data/announcements.json'
import type { AnnouncementsFile, SiteData } from '../types'
import { fetchSummary } from './api'

type Status = 'loading' | 'ready' | 'error'

const announcements = announcementsFile as AnnouncementsFile

export function useSiteData() {
  const [data, setData] = useState<SiteData | null>(null)
  const [live, setLive] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const payload = await fetchSummary()
      setData({
        summary: payload.summary,
        funds: payload.funds,
        usage: payload.usage,
        meta: { fetchedAt: payload.fetchedAt, recordCount: payload.summary.totalMembers },
        announcements,
      })
      setLive(payload.live)
      setStatus('ready')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'))
    }
  }, [])

  useEffect(() => {
    load()

    // Auto-refresh: poll every REFRESH_MS, plus on tab focus / becoming
    // visible. Skipped while the tab is hidden so a backgrounded tab doesn't
    // keep hitting the sheet.
    const REFRESH_MS = 60_000
    const tick = () => {
      if (document.visibilityState === 'visible') load()
    }
    const id = window.setInterval(tick, REFRESH_MS)
    const onFocus = () => load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return { data, live, status, error, reload: load }
}
