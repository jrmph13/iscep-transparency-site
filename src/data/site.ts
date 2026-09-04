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
 * Read key sent to the Apps Script. NOT a real secret (it ships in this
 * bundle) — it only turns away casual `curl`. Override per-deploy with
 * VITE_APPS_SCRIPT_KEY and keep it equal to the TX_READ_KEY script property
 * on the Apps Script side.
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
   * localStorage `allow_devtools=1`). FRICTION ONLY — trivially bypassed with a
   * proxy, `curl`, or by disabling JavaScript. Real protection is a private
   * sheet + Firestore rules + App Check.
   *
   * No-op in `npm run dev` (guards on import.meta.env.PROD); never on /admin.
   */
  clientHardening: true,

  /**
   * When true, the dashboard fetches `?route=summary` from APPS_SCRIPT_URL on
   * every load (a visible request in the Network tab). When false (default),
   * the totals come straight from the bundled aggregates in
   * src/data/fallback.json — no runtime request — and stay fresh via the
   * 30-minute scheduled rebuild.
   */
  liveSummary: false,
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

/** "Security & integrity" bullets in About — edit freely. */
export const SECURITY_NOTES: string[] = [
  'No login and no forms. You cannot change any record from here.',
  'Just static pages — no database and no server storing anything about you.',
  'No trackers, no ads, no cookies from this site.',
  'Names, receipt numbers and emails are not published. You only see your own record, and only if you know your student number.',
  'The source sheet stays private because it contains student details. The numbers here refresh from it every 30 minutes.',
  'Runs on HTTPS with the usual protection headers.',
]
