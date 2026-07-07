import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, signToken, ACCESS_COOKIE, SESSION_TTL_MS } from '@/lib/gate'

/**
 * GET /api/auth/verify?token=...
 *
 * Validates the emailed login token and exchanges it for a 30-day session
 * cookie, then redirects to the dashboard. Invalid/expired tokens redirect
 * back with ?login=expired so the gate overlay can show a retry message.
 *
 * Cookie is intentionally not HttpOnly — the client AccessGate overlay
 * reads it to decide locked/unlocked (see lib/gate.ts rationale).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const payload = verifyToken(token, 'login')

  if (!payload) {
    return NextResponse.redirect(new URL('/?login=expired', req.nextUrl.origin))
  }

  const session = signToken({ e: payload.e, x: Date.now() + SESSION_TTL_MS, k: 'session' })
  const res = NextResponse.redirect(new URL('/', req.nextUrl.origin))
  res.cookies.set(ACCESS_COOKIE, session, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
  return res
}
