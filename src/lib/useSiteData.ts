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
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  return { data, live, status, error, reload: load }
}
