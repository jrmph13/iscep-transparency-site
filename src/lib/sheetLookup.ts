import { LOOKUP_SHEET_GID, LOOKUP_SHEET_ID } from '../data/site'
import type { LookupRecord } from '../types'
import type { RecordResult } from './api'
import { BackendBlockedError, guardedFetch } from './backendGuard'

/**
 * Serverless record lookup: query the sheet's public gviz endpoint straight
 * from the browser, filtered server-side to the one student number so no other
 * row is transferred. Column P (e-mail) is never requested.
 *
 * Not a security boundary — see the note on LOOKUP_SHEET_ID in site.ts.
 */

// Accepts "2026-34816", "202634816", "2026 34816" — nothing else. Blocks any
// character that could alter the gviz query (quotes, spaces-as-operators, …).
// Bounded on both ends so an over-long input can't be used for abuse.
const SID_RE = /^[0-9]{3,8}[- ]?[0-9]{2,8}$/

// A..R minus P (e-mail). gviz uses column letters, not header names.
const COLS = 'A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,Q,R'

function title(s: string) {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim()
}
const clean = (s: string | undefined) => (s == null ? '' : String(s).trim())
function toNum(v: string) {
  const n = Number(String(v || '').replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Minimal RFC-4180-ish CSV parser (handles quotes, "" escapes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else q = false
      } else field += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else field += c
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x !== ''))
}

// Row layout after dropping column P: same as A..R but index 15 = Status,
// 16 = Timestamp (email removed).
// 0 Receipt 1 StudentNo 2 Date 3 Last 4 First 5 Middle 6 Year&Sec
// 7 SSG 8 BSIS 9 OrgShirt 10 Event 11 Others 12 AmountWord 13 Pesos 14 Cashier
// 15 Status 16 Timestamp
function mapRow(r: string[]): LookupRecord {
  const first = title(clean(r[4]))
  const middle = title(clean(r[5]))
  const last = title(clean(r[3]))
  const amount = toNum(clean(r[13]))
  const status = clean(r[15])
  return {
    name: [first, middle ? middle[0] + '.' : '', last].filter(Boolean).join(' '),
    firstName: first,
    middleName: middle,
    lastName: last,
    section: clean(r[6]).toUpperCase(),
    datePaid: clean(r[2]),
    fees: {
      ssg: clean(r[7]),
      membership: clean(r[8]),
      orgShirt: clean(r[9]),
      event: clean(r[10]),
      others: clean(r[11]),
    },
    amountLabel: clean(r[12]),
    amount,
    cashier: clean(r[14]),
    status,
    contributor: amount > 0 || /partial|paid/i.test(status),
    timestamp: clean(r[16]),
  }
}

export async function fetchRecordFromSheet(sidRaw: string): Promise<RecordResult> {
  // Disabled unless the deploy explicitly opted in (VITE_LOOKUP_SHEET_ID).
  // See the security note on LOOKUP_SHEET_ID in site.ts.
  if (!LOOKUP_SHEET_ID) return { found: false, records: [] }

  const sid = sidRaw.trim()
  if (!SID_RE.test(sid)) return { found: false, records: [] }

  const digits = sid.replace(/[^0-9]/g, '')
  // Match either the exact typed form or the digits-only form.
  const tq = `select ${COLS} where B = '${sid}' or B = '${digits}'`
  const url =
    `https://docs.google.com/spreadsheets/d/${LOOKUP_SHEET_ID}/gviz/tq` +
    `?tqx=out:csv&gid=${LOOKUP_SHEET_GID}&tq=${encodeURIComponent(tq)}&t=${Date.now()}`

  let res: Response
  try {
    res = await guardedFetch(url, { cache: 'no-store' })
  } catch (err) {
    // Guard refused the call (rate limit / open circuit / timeout) — degrade
    // to "not found" rather than surfacing an error for the fallback path.
    if (err instanceof BackendBlockedError) return { found: false, records: [] }
    throw err
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const rows = parseCsv(await res.text())
  // First row is the header echoed by gviz.
  const body = rows.slice(1).filter((r) => clean(r[1]) !== '')
  if (!body.length) return { found: false, records: [] }
  return { found: true, records: body.map(mapRow) }
}
