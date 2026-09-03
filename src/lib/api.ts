import { APPS_SCRIPT_KEY, APPS_SCRIPT_URL, FEATURES } from '../data/site'
import fallback from '../data/fallback.json'
import type { FundUsage, LookupRecord, Summary } from '../types'

const KEY = encodeURIComponent(APPS_SCRIPT_KEY)

export interface SummaryPayload {
  fetchedAt: string
  summary: Summary
  funds: { remainingFunds: number | null }
  usage: FundUsage[]
  live: boolean
}

/**
 * Dashboard totals. Prefers the live Apps Script; on any failure (or when no
 * URL is set) uses the aggregates bundled into the app (src/data/fallback.json)
 * — so nothing extra shows up in the Network tab.
 */
async function readJsonResponse(res: Response): Promise<any | null> {
  // A public Apps Script returns JSON. If it isn't public (or not authorised)
  // Google serves an HTML sign-in page instead — detect that and bail.
  const text = await res.text()
  const t = text.trimStart()
  if (!t || t[0] === '<') return null
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

export async function fetchSummary(): Promise<SummaryPayload> {
  // Live fetch is opt-in. By default the dashboard renders from the bundled
  // aggregates below, so no request appears in the Network tab.
  if (FEATURES.liveSummary && APPS_SCRIPT_URL) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?route=summary&key=${KEY}&t=${Date.now()}`, {
        cache: 'no-store',
      })
      const json = res.ok ? await readJsonResponse(res) : null
      if (json && json.summary && !json.error) {
        return {
          fetchedAt: json.fetchedAt || new Date().toISOString(),
          summary: json.summary as Summary,
          funds: json.funds || { remainingFunds: json.summary.remainingFunds ?? null },
          usage: Array.isArray(json.usage) ? (json.usage as FundUsage[]) : [],
          live: true,
        }
      }
      if (import.meta.env.DEV) console.warn('[api] Apps Script summary unavailable — using local fallback')
    } catch {
      /* fall through to local fallback */
    }
  }

  const s = fallback.summary as Summary
  return {
    fetchedAt: fallback.fetchedAt,
    summary: { ...s, recent: s.recent ?? [] },
    funds: fallback.funds ?? { remainingFunds: s.remainingFunds ?? null },
    usage: [],
    live: false,
  }
}

export interface RecordResult {
  found: boolean
  needName?: boolean
  records: LookupRecord[]
}

/**
 * One student's record, looked up by student number only.
 *
 * Tries the Apps Script endpoint first (if configured AND it actually returns
 * JSON). Anything else — not deployed, not public, network/CORS failure —
 * falls back to reading the sheet's own public CSV, filtered server-side to the
 * single matching row. See LOOKUP_SHEET_ID in site.ts for the trade-off.
 */
export async function fetchRecord(sid: string): Promise<RecordResult> {
  if (APPS_SCRIPT_URL) {
    try {
      const res = await fetch(
        `${APPS_SCRIPT_URL}?route=record&key=${KEY}&sid=${encodeURIComponent(sid)}&t=${Date.now()}`,
        { cache: 'no-store' }
      )
      const json = res.ok ? await readJsonResponse(res) : null
      if (json && !json.error) {
        return {
          found: !!json.found,
          records: Array.isArray(json.records) ? json.records : [],
        }
      }
      // json === null (HTML sign-in page) or json.error → fall through to CSV.
    } catch {
      /* network / CORS — fall through to CSV */
    }
  }

  const { fetchRecordFromSheet } = await import('./sheetLookup')
  return fetchRecordFromSheet(sid)
}
