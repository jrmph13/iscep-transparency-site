import { APPS_SCRIPT_KEY, APPS_SCRIPT_URL } from '../data/site'
import type { FundUsage, LookupRecord, Summary } from '../types'
import { guardedFetch } from './backendGuard'

const KEY = encodeURIComponent(APPS_SCRIPT_KEY)

export interface SummaryPayload {
  fetchedAt: string
  summary: Summary
  funds: { remainingFunds: number | null }
  usage: FundUsage[]
  live: boolean
}

async function readJsonResponse(res: Response): Promise<any | null> {
  // The data API returns JSON. If it isn't reachable or not authorised, an
  // HTML page can come back instead — detect that and bail.
  const text = await res.text()
  const t = text.trimStart()
  if (!t || t[0] === '<') return null
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

/**
 * Dashboard totals — real data only. Everything comes from the Render API
 * (APPS_SCRIPT_URL), which reads the sheet. There is NO bundled fallback: if
 * the API can't be reached this throws, and the page shows an error instead of
 * stale numbers.
 */
export async function fetchSummary(): Promise<SummaryPayload> {
  if (!APPS_SCRIPT_URL) throw new Error('Data source is not configured (VITE_APPS_SCRIPT_URL).')
  const res = await guardedFetch(`${APPS_SCRIPT_URL}?route=summary&key=${KEY}&t=${Date.now()}`, {
    cache: 'no-store',
  })
  const json = res.ok ? await readJsonResponse(res) : null
  if (!json || json.error || !json.summary) {
    throw new Error(json && json.error ? String(json.error) : `Could not load live data (${res.status}).`)
  }
  return {
    fetchedAt: json.fetchedAt || new Date().toISOString(),
    summary: json.summary as Summary,
    funds: json.funds || { remainingFunds: json.summary.remainingFunds ?? null },
    usage: Array.isArray(json.usage) ? (json.usage as FundUsage[]) : [],
    live: true,
  }
}

export interface RecordResult {
  found: boolean
  needName?: boolean
  records: LookupRecord[]
}

/**
 * One student's record, looked up by student number only, from the Render API.
 * No fallback to reading the sheet from the browser: if the API is unreachable
 * this throws and the lookup shows an error.
 */
export async function fetchRecord(sid: string, turnstileToken = ''): Promise<RecordResult> {
  if (!APPS_SCRIPT_URL) throw new Error('Data source is not configured (VITE_APPS_SCRIPT_URL).')
  const res = await guardedFetch(
    `${APPS_SCRIPT_URL}?route=record&key=${KEY}&sid=${encodeURIComponent(sid)}` +
      `&cftoken=${encodeURIComponent(turnstileToken)}&t=${Date.now()}`,
    { cache: 'no-store' }
  )
  const json = res.ok ? await readJsonResponse(res) : null
  if (!json || json.error) {
    throw new Error(json && json.error ? String(json.error) : `Could not load the record (${res.status}).`)
  }
  return {
    found: !!json.found,
    records: Array.isArray(json.records) ? json.records : [],
  }
}
