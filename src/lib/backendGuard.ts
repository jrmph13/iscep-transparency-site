/**
 * backendGuard — a small, self-contained protection layer in front of EVERY
 * outbound call this site makes to a backend (the Apps Script `/exec` endpoint
 * and the sheet's gviz endpoint).
 *
 * It is NOT a server-side firewall — the browser can't be one. What it does:
 *
 *   1. Global rate limit  — a token bucket shared by all call sites, so no
 *      combination of components (or a stuck render loop, or a user hammering
 *      a button) can turn this tab into a request amplifier.
 *   2. Circuit breaker    — after a run of failures it stops calling the
 *      backend for a cooldown and fails fast instead. When the origin is
 *      already struggling, the worst thing a client can do is keep retrying;
 *      this makes the client back off automatically so the origin gets room
 *      to recover instead of a retry storm.
 *   3. Timeout + bounded backoff — every request is aborted if it hangs, and
 *      transient failures retry at most twice with exponential backoff + jitter
 *      (never a tight loop).
 *
 * Callers already have offline fallbacks (bundled aggregates / "try again"),
 * so when this layer refuses a call it just throws and the caller degrades
 * gracefully — nothing here needs to surface an error to the user.
 */

export class BackendBlockedError extends Error {
  constructor(
    message: string,
    readonly reason: 'rate-limited' | 'circuit-open' | 'timeout'
  ) {
    super(message)
    this.name = 'BackendBlockedError'
  }
}

/* ---- 1. Global token bucket -------------------------------------------------
 * REFILL_PER_SEC tokens trickle back each second up to BUCKET_MAX. A request
 * costs one token. Generous enough that no real user ever notices; tight
 * enough that a runaway caller is capped at a low steady rate. */
const BUCKET_MAX = 8
const REFILL_PER_SEC = 1

let tokens = BUCKET_MAX
let lastRefill = now()

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function takeToken(): boolean {
  const t = now()
  const elapsedSec = (t - lastRefill) / 1000
  if (elapsedSec > 0) {
    tokens = Math.min(BUCKET_MAX, tokens + elapsedSec * REFILL_PER_SEC)
    lastRefill = t
  }
  if (tokens >= 1) {
    tokens -= 1
    return true
  }
  return false
}

/* ---- 2. Circuit breaker ---------------------------------------------------- */
const FAIL_THRESHOLD = 4 // consecutive failures before the circuit opens
const OPEN_MS = 30_000 // how long to stay open (fail fast) before a trial call

let consecutiveFailures = 0
let openUntil = 0

function circuitOpen(): boolean {
  return Date.now() < openUntil
}

function recordSuccess(): void {
  consecutiveFailures = 0
  openUntil = 0
}

function recordFailure(): void {
  consecutiveFailures += 1
  if (consecutiveFailures >= FAIL_THRESHOLD) {
    openUntil = Date.now() + OPEN_MS
  }
}

/* ---- 3. The guarded fetch ------------------------------------------------- */
export interface GuardedFetchOptions extends RequestInit {
  /** Abort the request after this many ms (default 8000). */
  timeoutMs?: number
  /** Extra retries on transient failure (default 2, capped at 3). */
  retries?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isTransient(res: Response | null): boolean {
  // No response → network error. 408/425/429/5xx → server said "later".
  if (!res) return true
  return res.status === 408 || res.status === 425 || res.status === 429 || res.status >= 500
}

/**
 * Drop-in replacement for `fetch` for backend calls. Throws
 * `BackendBlockedError` when the guard refuses the call (caller should fall
 * back), or the underlying fetch error when the request itself fails after
 * retries.
 */
export async function guardedFetch(
  input: string,
  opts: GuardedFetchOptions = {}
): Promise<Response> {
  if (circuitOpen()) {
    throw new BackendBlockedError('backend circuit is open — backing off', 'circuit-open')
  }
  if (!takeToken()) {
    throw new BackendBlockedError('local rate limit — too many backend calls', 'rate-limited')
  }

  const { timeoutMs = 8000, retries = 2, ...init } = opts
  const maxAttempts = 1 + Math.min(Math.max(retries, 0), 3)

  let lastErr: unknown = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal })
      clearTimeout(timer)

      if (isTransient(res) && attempt < maxAttempts) {
        await sleep(backoff(attempt))
        continue
      }
      if (isTransient(res)) {
        recordFailure()
        return res // let the caller inspect / fall back
      }
      recordSuccess()
      return res
    } catch (err) {
      clearTimeout(timer)
      lastErr = err
      if (attempt < maxAttempts) {
        await sleep(backoff(attempt))
        continue
      }
      recordFailure()
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new BackendBlockedError('backend request timed out', 'timeout')
      }
      throw err
    }
  }
  // Unreachable, but keeps the type checker happy.
  throw lastErr ?? new Error('guardedFetch: exhausted retries')
}

/** Exponential backoff with full jitter: ~0.4s, ~0.8s, ~1.6s (± jitter). */
function backoff(attempt: number): number {
  const base = 400 * 2 ** (attempt - 1)
  return base / 2 + Math.random() * (base / 2)
}

/** For tests / debugging — current guard state. */
export function guardState() {
  return {
    tokens: Math.floor(tokens),
    consecutiveFailures,
    circuitOpen: circuitOpen(),
    openForMs: Math.max(0, openUntil - Date.now()),
  }
}
