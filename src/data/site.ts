/* -------------------------------------------------------------------------
 * EDIT THIS FILE to update the site's written content.
 * Everything here is plain data — no code knowledge needed.
 * After editing, commit & push; the site redeploys automatically.
 * ---------------------------------------------------------------------- */
import type { Announcement } from '../types'
export type { Announcement }

export const ORG = {
  name: 'ISCEP',
  fullName: 'Information Systems for Community Engagement and Professionalism',
  parentLabel: 'MSTIP — Department Portal',
  portalLabel: 'Official Financial Transparency & Fund Utilization Portal',
  tagline: 'Fund Transparency Board',
  intro:
    'A read-only view of ISCEP collections and the remaining balance, pulled straight from the auditor’s receipt sheet. Nothing here can be edited from a browser.',
  sheetLabel: 'ISCEP-AUTOMATED-RECEIPT SYSTEM',
  // Canonical Page: vanity handle "mstip.iscep" (numeric id 107473958961394).
  // The id 100090751490057 also redirects here.
  facebookUrl: 'https://www.facebook.com/mstip.iscep',
  facebookPageId: '107473958961394',
  contactEmail: 'iscep.department@mstip.edu.ph', // TODO: confirm
  copyright: '© 2026 ISCEP Department — MSTIP. All rights reserved.',
}

/**
 * Deployed Apps Script Web App URL (…/exec).
 *
 * By default it is used ONLY for the per-student record lookup
 * (`?route=record&sid=`). The dashboard totals do NOT call it — they render
 * from the aggregates baked into the bundle (src/data/fallback.json, refreshed
 * every 30 min by the scheduled rebuild), so the site makes zero data requests
 * on load. Set FEATURES.liveSummary = true to also fetch `?route=summary` live.
 *
 * Not a secret — it only ever returns aggregates or a single record. Leave the
 * string blank to disable the record lookup entirely.
 */
export const APPS_SCRIPT_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbz9mwsNOFkfnVY126n-d5WmhtKbJLG-Fo0iC0bZjU8i2tlDncaSEaufIMtqSfzh5SmF/exec'

/**
 * Read key sent to the Apps Script. Not a real secret — it ships in this
 * bundle, so treat it as a deploy identifier, not access control. Override
 * per-deploy with VITE_APPS_SCRIPT_KEY and keep it equal to the TX_READ_KEY
 * script property on the Apps Script side. Real enforcement is the rate caps
 * and (optionally) Turnstile on the Apps Script side.
 */
export const APPS_SCRIPT_KEY =
  import.meta.env.VITE_APPS_SCRIPT_KEY || 'iscep-CHANGE-ME-2026'

/**
 * Fallback record lookup — reads the sheet's own CSV endpoint directly from the
 * browser and filters server-side (gviz `tq`) so only the matching row is sent.
 * Used ONLY when APPS_SCRIPT_URL isn't reachable.
 *
 * ⚠️  SECURITY: enabling this publishes the spreadsheet id in the site's JS and
 * requires the sheet to be "Anyone with the link can view". Anyone can then
 * query *any* row — the client-side row filter is cosmetic, not a boundary
 * (client code is always inspectable). Because the sheet holds student PII this
 * is OFF unless you explicitly opt in by setting VITE_LOOKUP_SHEET_ID at build
 * time. Prefer keeping the sheet private and serving every read through the
 * Apps Script instead.
 */
export const LOOKUP_SHEET_ID = import.meta.env.VITE_LOOKUP_SHEET_ID || ''
export const LOOKUP_SHEET_GID = import.meta.env.VITE_LOOKUP_SHEET_GID || '0'

/**
 * Real-time fund figures, read straight from the sheet when the Apps Script
 * `?route=summary` isn't reachable. See src/lib/liveSheet.ts — ONLY aggregate
 * `select sum()/count()` queries are sent, so no student row is transferred.
 *
 * ⚠️  The `sheetId` here ships in the bundle and this path only works while the
 * spreadsheet is link-readable. Once the sheet is made private (recommended),
 * set VITE_LIVE_FUNDS_SHEET_ID='' (or leave the deploy without it) and rely on
 * the Apps Script summary instead.
 */
export const LIVE_FUNDS = {
  sheetId:
    import.meta.env.VITE_LIVE_FUNDS_SHEET_ID ??
    '1IgqaP6JNNdtyaFeV1SghwDqWYRjGvG6x6zII0iNBXpc',
  paymentsGid: import.meta.env.VITE_LIVE_FUNDS_PAYMENTS_GID || '0',
  h2goGid: import.meta.env.VITE_LIVE_FUNDS_H2GO_GID || '705088589',
  budgetGid: import.meta.env.VITE_LIVE_FUNDS_BUDGET_GID || '1861893164',
}

/**
 * Cloudflare Turnstile site key for the record lookup (the one route that
 * returns per-student PII, so it's the only route worth gating). Free,
 * self-serve, no domain/DNS change needed — sign up at
 * dash.cloudflare.com/?to=/:account/turnstile, create a widget for this
 * site's origin, and set VITE_TURNSTILE_SITE_KEY at build time.
 *
 * Blank (default) disables the widget entirely and the lookup behaves exactly
 * as before. The matching TX_TURNSTILE_SECRET script property on the Apps
 * Script side is what actually enforces it — see apps-script/Code.gs. Setting
 * only one side either does nothing (secret unset) or locks lookups out
 * entirely (secret set, site key unset), so keep both in sync.
 */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

export const FEATURES = {
  /**
   * Show the live Facebook Page Plugin (an iframe) beside the announcement
   * cards. Works with no token — Facebook renders the real posts + photos
   * itself. Trade-off: clicking a post opens facebook.com in a new tab.
   * Set to false to show only the hand-written cards below.
   */
  facebookEmbed: true,

  /**
   * Tier B deterrence on the PUBLIC pages (see src/lib/deterrence.ts):
   * swallows devtools/view-source hotkeys, emits one-shot telemetry signals,
   * and prints a Self-XSS console warning. It NEVER blanks/reloads the page,
   * never loops a `debugger`, and honours an opt-out (`?debug=1` or
   * localStorage `allow_devtools=1`). Friction only, not a security boundary
   * — real protection is a private sheet + Firestore rules + App Check.
   *
   * No-op in `npm run dev` (guards on import.meta.env.PROD); never on /admin.
   */
  clientHardening: true,

  /**
   * When true, the dashboard fetches `?route=summary` from APPS_SCRIPT_URL on
   * every load (a visible request in the Network tab) so the totals are live,
   * not up-to-30-minutes old. The Apps Script serves this from a 60-second
   * server-side cache, and on ANY failure — offline, quota, the backendGuard
   * circuit tripping — the app silently falls back to the bundled aggregates
   * in src/data/fallback.json (still refreshed by the 30-minute rebuild), so
   * a page always renders. Set to false to go back to bundle-only, no request.
   */
  liveSummary: true,
}

/**
 * Announcements shown as cards on the site itself (text + image, no redirect).
 *
 * To post an update from Facebook:
 *   1. Copy the post caption into `body`.
 *   2. Save the post's photo into  public/announcements/  and put its path in
 *      `image`, e.g. "announcements/sept-drive.jpg"  (or paste any image URL).
 *   3. Optionally add the post link in `link` as an "See on Facebook" button.
 *   4. Commit & push — the site redeploys.
 *
 * (If public/data/announcements.json has items — e.g. from the Graph API
 *  fetcher — those are used instead of this list.)
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    date: '2026-09-02',
    title: 'Transparency board is up',
    body: 'You can now check the ISCEP funds here — total collected, what’s left, and a breakdown per section.\n\nIf a number doesn’t match your receipt, message the auditor with your receipt number.',
    tag: 'Notice',
    important: true,
  },
  {
    date: '2026-09-01',
    title: 'Fund update (sample)',
    body: 'Replace this with the latest fund post from Facebook — how much was collected, what it was spent on, and the balance now.\n\nDrop the post photo in public/announcements/ and set "image", and paste the post link in "link".',
    tag: 'Funds',
    // image: 'announcements/example.jpg',
    // link: 'https://www.facebook.com/mstip.iscep/posts/....',
  },
]

export interface Officer {
  name: string
  role: string
  handle?: string
}

/** Officers accountable for the funds shown on this page. */
export const OFFICERS: Officer[] = [
  { name: 'ISCEP Auditor', role: 'Auditor — maintains the receipt spreadsheet', handle: 'AuditorTalento' },
  { name: 'ISCEP Treasurer', role: 'Treasurer — fund custody & disbursement' },
  { name: 'ISCEP President', role: 'President — final approval on disbursements' },
]

export const FEE_LABELS: Record<string, string> = {
  ssg: 'SSG',
  membership: 'BSIS Membership Fee',
  orgShirt: 'Org Shirt',
  event: 'Event',
  others: 'Others',
}

/** Short description of what each fee is for — shown in About. */
export const FEE_INFO: { key: string; label: string; desc: string }[] = [
  { key: 'membership', label: 'BSIS Membership Fee', desc: '₱50 org membership dues for the school year.' },
  { key: 'ssg', label: 'SSG', desc: 'Supreme Student Government collection, if applicable.' },
  { key: 'orgShirt', label: 'Org Shirt', desc: 'Payment for the official ISCEP shirt.' },
  { key: 'event', label: 'Event', desc: 'Contributions tied to a specific ISCEP event.' },
  { key: 'others', label: 'Others', desc: 'Any other logged collection.' },
]

export interface FaqItem {
  q: string
  a: string
}

/** Frequently asked questions, shown as an accordion above About. Edit freely. */
export const FAQS: FaqItem[] = [
  {
    q: 'Why can’t I search for other students?',
    a: 'The lookup only ever returns the one record matching the exact student number you type — there’s no way to browse or list everyone else’s records from here. That’s by design: names, receipt numbers and payment details stay between you and the auditor unless you already know the number.',
  },
  {
    q: 'I paid, but my record still says "No amount yet." What do I do?',
    a: 'The numbers here are a mirror of the auditor’s receipt sheet, refreshed every 30 minutes — so a very recent payment may just not have synced yet. If it still doesn’t show up after a day, message the auditor directly with your receipt number so they can check the entry.',
  },
  {
    q: 'How often do the totals update?',
    a: 'A scheduled job re-reads the receipt sheet and republishes this page every 30 minutes. The "Updated" timestamp near the top of the page always reflects the last successful sync.',
  },
  {
    q: 'Can someone edit the numbers from this website?',
    a: 'No. This site only reads — there’s no login, no form, and no code path here that writes back to the sheet. Every figure you see is computed straight from the auditor’s spreadsheet, which only the auditor can edit.',
  },
  {
    q: 'Is my personal information safe here?',
    a: 'The public sections show totals and per-section breakdowns only — no names, no student numbers, no receipt numbers. Your own record is shown only to you, and only after you type your own student number. See "Security & integrity" below for the full list.',
  },
  {
    q: 'What if a total looks wrong?',
    a: 'Start with your own receipt: search your student number above and check the amount against what you were issued. If something still doesn’t match, message the auditor with your receipt number — figures are only ever corrected on the source sheet, never on this page directly.',
  },
]

/** "Security & integrity" bullets in About — edit freely. */
export const SECURITY_NOTES: string[] = [
  'No login and no forms. You cannot change any record from here.',
  'Just static pages — no database and no server storing anything about you.',
  'No trackers, no ads, no cookies from this site.',
  'Names, receipt numbers and emails are not published. You only see your own record, and only if you know your student number.',
  'The source sheet stays private because it contains student details. The numbers here refresh from it every 30 minutes.',
  'Runs on HTTPS with the usual protection headers.',
]
