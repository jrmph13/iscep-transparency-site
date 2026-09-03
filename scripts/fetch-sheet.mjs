/**
 * Pulls the ISCEP receipt / funds data from the Google Sheet and writes only
 * de-identified JSON to `public/data/*.json`.
 *
 * The spreadsheet id is a SECRET (the sheet holds student PII). It is NOT in
 * this repo — provide it at run time:
 *   - GitHub Actions: repo secret  SHEET_ID  (see .github/workflows/deploy.yml)
 *   - Local:          a gitignored  sheet.config.json  →  { "SHEET_ID": "..." }
 *                     or  SHEET_ID=xxxx npm run sync
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'data')

let localCfg = {}
try {
  localCfg = JSON.parse(readFileSync(join(ROOT, 'sheet.config.json'), 'utf8'))
} catch {
  /* no local config — rely on env */
}

const SHEET_ID = process.env.SHEET_ID || localCfg.SHEET_ID
const RECORDS_GID = process.env.SHEET_RECORDS_GID || localCfg.SHEET_RECORDS_GID || '0'
const FUNDS_GID = process.env.SHEET_FUNDS_GID || localCfg.SHEET_FUNDS_GID || '301552702'

if (!SHEET_ID) {
  const hasData = await readFile(join(OUT_DIR, 'meta.json')).then(
    () => true,
    () => false
  )
  console.warn(
    'fetch-sheet: SHEET_ID not set — skipping the pull.\n' +
      '  • CI: add a repo secret named SHEET_ID\n' +
      '  • Local: create sheet.config.json  { "SHEET_ID": "..." }  (gitignored)\n' +
      (hasData
        ? '  Using the JSON already in public/data/.'
        : '  No data files present — the build will have nothing to show.')
  )
  process.exit(0)
}

const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`

/* ------------------------------- CSV parsing ------------------------------- */

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c === '\r') {
      // ignore, handled by \n
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const clean = (v) => (v == null ? '' : String(v).trim())

function toNumber(v) {
  const n = Number(clean(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function titleCase(v) {
  return clean(v)
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
}

/* ------------------------------- fetch step ------------------------------- */

async function getCsv(gid) {
  const res = await fetch(csvUrl(gid), {
    headers: { 'User-Agent': 'iscep-transparency-site/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for gid ${gid}`)
  return res.text()
}

function buildRecords(rows) {
  // First row is the header from the sheet.
  const body = rows.slice(1).filter((r) => r.some((c) => clean(c) !== ''))
  const records = body.map((r, idx) => {
    const last = titleCase(r[3])
    const first = titleCase(r[4])
    const middle = titleCase(r[5])
    const amount = toNumber(r[13])
    const status = clean(r[16])
    return {
      id: clean(r[0]) || `row-${idx + 2}`,
      receiptNo: clean(r[0]),
      studentNo: clean(r[1]),
      datePaid: clean(r[2]),
      lastName: last,
      firstName: first,
      middleName: middle,
      name: [first, middle ? middle[0] + '.' : '', last].filter(Boolean).join(' '),
      section: clean(r[6]).toUpperCase(),
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
      // e-mail is intentionally NOT written to the public JSON.
      status,
      contributor: amount > 0 || /partial|paid/i.test(status),
      timestamp: clean(r[17]),
    }
  })
  return records
}

const PER_MEMBER_FEE = 50 // BSIS membership fee per member, ₱

function summarize(records, remainingFunds) {
  const bySectionMap = new Map()
  const statusMap = new Map()
  const cashierMap = new Map()
  const feeKeys = ['ssg', 'membership', 'orgShirt', 'event', 'others']
  const feeCounts = Object.fromEntries(feeKeys.map((k) => [k, 0]))
  let totalCollected = 0
  let contributors = 0

  for (const rec of records) {
    totalCollected += rec.amount
    if (rec.contributor) contributors++
    for (const k of feeKeys) {
      if (/^paid$/i.test(rec.fees[k])) feeCounts[k]++
    }

    const key = rec.section || 'Unlisted'
    const s = bySectionMap.get(key) || { section: key, members: 0, contributors: 0, collected: 0 }
    s.members++
    if (rec.contributor) s.contributors++
    s.collected += rec.amount
    bySectionMap.set(key, s)

    const st = rec.status || (rec.contributor ? 'Recorded' : 'No amount yet')
    statusMap.set(st, (statusMap.get(st) || 0) + 1)

    if (rec.amount > 0) {
      const c = rec.cashier || 'Unspecified'
      const cur = cashierMap.get(c) || { cashier: c, count: 0, collected: 0 }
      cur.count++
      cur.collected += rec.amount
      cashierMap.set(c, cur)
    }
  }

  const bySection = [...bySectionMap.values()]
    .map((s) => ({
      ...s,
      expected: s.members * PER_MEMBER_FEE,
      rate: s.members ? s.collected / (s.members * PER_MEMBER_FEE) : 0,
    }))
    .sort((a, b) => b.collected - a.collected || b.members - a.members)

  const statusCounts = [...statusMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const byCashier = [...cashierMap.values()].sort((a, b) => b.collected - a.collected)

  const recent = records
    .map((r) => ({ section: r.section, amount: r.amount, ts: Date.parse(r.timestamp.replace(/-/g, '/')) || 0 }))
    .filter((r) => r.ts > 0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8)
    .map((r) => ({ section: r.section, amount: r.amount, date: new Date(r.ts).toISOString().slice(0, 10) }))

  const expectedMembership = records.length * PER_MEMBER_FEE

  return {
    totalCollected,
    remainingFunds,
    spent: remainingFunds != null ? Math.max(totalCollected - remainingFunds, 0) : null,
    perMemberFee: PER_MEMBER_FEE,
    expectedMembership,
    collectionRate: expectedMembership ? totalCollected / expectedMembership : 0,
    totalMembers: records.length,
    contributors,
    pending: records.length - contributors,
    feeCounts,
    bySection,
    statusCounts,
    byCashier,
    recent,
  }
}

function extractPeso(rows) {
  for (const row of rows) {
    for (const cell of row) {
      const m = clean(cell).match(/₱\s*([\d,]+(?:\.\d+)?)/)
      if (m) return toNumber(m[1])
    }
  }
  return null
}

/* --------------------------------- main --------------------------------- */

async function writeJson(name, data) {
  await writeFile(join(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`  wrote public/data/${name}`)
}

async function readJson(name) {
  try {
    return JSON.parse(await readFile(join(OUT_DIR, name), 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  console.log(`Fetching sheet …${String(SHEET_ID).slice(-4)}`)

  const [recordsCsv, fundsCsv] = await Promise.all([
    getCsv(RECORDS_GID),
    getCsv(FUNDS_GID).catch((e) => {
      console.warn(`  funds tab failed: ${e.message}`)
      return ''
    }),
  ])

  const records = buildRecords(parseCsv(recordsCsv))
  const fundsRows = fundsCsv ? parseCsv(fundsCsv) : []
  const remainingFunds = extractPeso(fundsRows)
  const summary = summarize(records, remainingFunds)

  // De-identified aggregates only. Written to src/data/ so they are *bundled*
  // into the minified JS — there is no separate summary/funds/meta file to see
  // in the Network tab. Individual records never leave the Apps Script.
  const fallback = {
    fetchedAt: new Date().toISOString(),
    recordCount: records.length,
    summary,
    funds: { remainingFunds },
  }
  const fbPath = join(ROOT, 'src', 'data', 'fallback.json')
  await writeFile(fbPath, JSON.stringify(fallback, null, 2) + '\n', 'utf8')
  console.log('  wrote src/data/fallback.json')

  console.log(
    `Done: ${records.length} records, ₱${summary.totalCollected.toLocaleString()} collected, ` +
      `remaining ${remainingFunds == null ? 'n/a' : '₱' + remainingFunds.toLocaleString()}.`
  )
}

main().catch(async (err) => {
  console.error(`\nfetch-sheet failed: ${err.message}`)
  try {
    await readFile(join(ROOT, 'src', 'data', 'fallback.json'))
    console.error('Keeping the existing src/data/fallback.json.')
    process.exit(0)
  } catch {
    process.exit(1)
  }
})
