/**
 * Return `url` only if it is an absolute http(s) URL, else undefined. Use this
 * before putting any stored / external string into an href so a `javascript:`,
 * `data:` or other scheme can't ride a trusted-looking link.
 */
export function safeExternalUrl(url: string | null | undefined): string | undefined {
  const v = (url || '').trim()
  if (!/^https?:\/\//i.test(v)) return undefined
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined
  } catch {
    return undefined
  }
}

export function peso(n: number | null | undefined, withDecimals = false): string {
  if (n == null) return '—'
  return (
    '₱' +
    n.toLocaleString('en-PH', {
      minimumFractionDigits: withDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })
  )
}

export function num(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-PH')
}

export function pct(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) return '0%'
  return (ratio * 100).toFixed(digits) + '%'
}

/** Parse the sheet's "M/D/YYYY H:mm" timestamp into a Date, or null. */
export function parseTimestamp(ts: string): Date | null {
  if (!ts) return null
  const d = new Date(ts.replace(/-/g, '/'))
  return Number.isNaN(d.getTime()) ? null : d
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Auto-insert the "YYYY-#####" dash as digits are typed. iOS's numeric
 * keypad (inputMode="numeric") has no "-" key, so students on iPhone
 * couldn't type the student-number format at all — this derives the dash
 * from digit count instead of requiring the user to type it.
 */
export function formatStudentId(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

export function fullDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
