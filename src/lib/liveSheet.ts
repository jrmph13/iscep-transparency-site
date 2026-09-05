/**
 * Real-time fund figures read straight from the spreadsheet, for when the
 * Apps Script `?route=summary` isn't reachable but the sheet itself is public.
 *
 * Only AGGREGATE queries are sent — `select sum(...)` / `count(...)` — so the
 * browser receives three numbers, never a student row. The spreadsheet id does
 * ship in the bundle though, and this only works while the sheet is link-
 * readable; the proper path is a private sheet behind the Apps Script.
 *
 * Mirrors the workbook's own B5 formula:
 *   remaining = SUM('Payment Records'!N) + SUM('H2Go Records'!B)
 *             - SUM('Budget and Funds Records'!E)
 */
import { LIVE_FUNDS } from '../data/site'
import { guardedFetch } from './backendGuard'

export interface LiveFunds {
  membershipCollected: number
  h2goCollected: number
  spent: number
  totalCollected: number
  remainingFunds: number
  totalMembers: number
  expectedMembership: number
  collectionRate: number
  fetchedAt: string
}

const PER_MEMBER_FEE = 50

function gvizUrl(gid: string, tq: string): string {
  return (
    `https://docs.google.com/spreadsheets/d/${LIVE_FUNDS.sheetId}/gviz/tq` +
    `?tqx=out:csv&gid=${gid}&tq=${encodeURIComponent(tq)}&t=${Date.now()}`
  )
}

/** A `select sum()/count()` gviz CSV reply is a header line then one row of numbers. */
function parseNumbers(csv: string): number[] {
  const line = csv.trim().split(/\r?\n/).slice(1).join(' ')
  return (line.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
}

async function fetchNumbers(gid: string, tq: string): Promise<number[]> {
  const res = await guardedFetch(gvizUrl(gid, tq), { cache: 'no-store' })
  if (!res.ok) throw new Error(`gviz HTTP ${res.status}`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw new Error('gviz returned HTML (sheet not public?)')
  return parseNumbers(text)
}

export async function fetchLiveFunds(): Promise<LiveFunds | null> {
  if (!LIVE_FUNDS.sheetId) return null

  const [payments, h2go, budget] = await Promise.all([
    // count(B) = students on record, sum(N) = Pesos/Php collected
    fetchNumbers(LIVE_FUNDS.paymentsGid, 'select count(B), sum(N)'),
    fetchNumbers(LIVE_FUNDS.h2goGid, 'select sum(B)').catch(() => [0]),
    fetchNumbers(LIVE_FUNDS.budgetGid, 'select sum(E)').catch(() => [0]),
  ])

  const totalMembers = Math.round(payments[0] || 0)
  const membershipCollected = payments[1] || 0
  const h2goCollected = h2go[0] || 0
  const spent = budget[0] || 0
  const totalCollected = membershipCollected + h2goCollected
  const remainingFunds = Math.max(totalCollected - spent, 0)
  const expectedMembership = totalMembers * PER_MEMBER_FEE

  return {
    membershipCollected,
    h2goCollected,
    spent,
    totalCollected,
    remainingFunds,
    totalMembers,
    expectedMembership,
    collectionRate: expectedMembership ? membershipCollected / expectedMembership : 0,
    fetchedAt: new Date().toISOString(),
  }
}
