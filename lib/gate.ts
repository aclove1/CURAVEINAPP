import { createHmac, timingSafeEqual } from 'crypto'

/**
 * gate.ts — magic-link access tokens
 *
 * Two token kinds, both HMAC-SHA256 signed with AUTH_SECRET:
 *   'login'   — short-lived (15 min), embedded in the emailed link
 *   'session' — long-lived (30 days), stored in the cv_access cookie
 *
 * Format: base64url(JSON payload) + '.' + base64url(HMAC signature)
 * No JWT library — node:crypto only, zero new dependencies.
 *
 * The cookie is deliberately NOT HttpOnly: the AccessGate overlay reads it
 * client-side to decide locked/unlocked. Server-side verification is still
 * signature-checked wherever it matters. Threat model is investor lead
 * capture with verified email, not secret protection.
 */

export const ACCESS_COOKIE = 'cv_access'
export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface TokenPayload {
  /** email address */
  e: string
  /** expiry, ms epoch */
  x: number
  /** token kind */
  k: 'login' | 'session'
}

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) {
    // Fail loudly — a silently-unsigned gate is worse than a build error.
    throw new Error('AUTH_SECRET env var is not set. Configure it in Vercel (Production + Preview) and .env.local for dev.')
  }
  return s
}

export function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret()).update(body).digest().toString('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token: string, kind: TokenPayload['k']): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = createHmac('sha256', secret()).update(body).digest()
  let got: Buffer
  try {
    got = Buffer.from(sig, 'base64url')
  } catch {
    return null
  }
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload
    if (payload.k !== kind) return null
    if (typeof payload.x !== 'number' || Date.now() > payload.x) return null
    if (typeof payload.e !== 'string' || payload.e.length === 0) return null
    return payload
  } catch {
    return null
  }
}
