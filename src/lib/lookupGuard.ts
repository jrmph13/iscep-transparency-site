/**
 * Client-side friction for the record lookup. This is NOT a security boundary —
 * anyone can call the sheet's gviz endpoint directly (see LOOKUP_SHEET_ID in
 * site.ts). It only slows casual enumeration through the UI and traps naive bots.
 */

const MIN_GAP_MS = 2500 // between two lookups
const SESSION_CAP = 12 // lookups per tab before a cooldown
const COOLDOWN_MS = 60_000

let lastAt = 0
let count = 0
let cooldownUntil = 0

export type GuardResult = { ok: true } | { ok: false; reason: string; waitMs: number }

export function checkLookupAllowed(): GuardResult {
  const now = Date.now()
  if (now < cooldownUntil) {
    return {
      ok: false,
      reason: `Too many lookups. Try again in ${Math.ceil((cooldownUntil - now) / 1000)}s.`,
      waitMs: cooldownUntil - now,
    }
  }
  if (now - lastAt < MIN_GAP_MS) {
    return { ok: false, reason: 'One moment…', waitMs: MIN_GAP_MS - (now - lastAt) }
  }
  return { ok: true }
}

export function noteLookup(): void {
  lastAt = Date.now()
  count += 1
  if (count >= SESSION_CAP) {
    cooldownUntil = Date.now() + COOLDOWN_MS
    count = 0
  }
}

/** True when the honeypot field was filled — i.e. a bot submitted the form. */
export function isBotSubmission(honeypotValue: string): boolean {
  return honeypotValue.trim().length > 0
}

/** Shared props for a visually-hidden honeypot input. */
export const HONEYPOT_NAME = 'company_website'
export const honeypotFieldProps = {
  type: 'text',
  name: HONEYPOT_NAME,
  tabIndex: -1,
  autoComplete: 'off',
  'aria-hidden': true as const,
  style: {
    position: 'absolute' as const,
    left: '-9999px',
    width: '1px',
    height: '1px',
    opacity: 0,
    pointerEvents: 'none' as const,
  },
}
