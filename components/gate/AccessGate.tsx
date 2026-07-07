'use client'

import { useEffect, useState, FormEvent } from 'react'

/**
 * AccessGate
 *
 * Full-screen email gate rendered above the app in AppShell. The app stays
 * visible but blurred behind the overlay (teaser), interaction is blocked,
 * and entering an email triggers a magic login link (/api/auth/request).
 * Clicking the emailed link (/api/auth/verify) sets the cv_access cookie
 * for 30 days and the overlay never mounts again until expiry.
 *
 * Client-side cookie check is UX-only; the cookie itself is HMAC-signed
 * server-side. This gates access and captures verified investor emails —
 * it is not a security boundary (the model was fully public before this).
 */

const ACCESS_COOKIE = 'cv_access'

type GateState = 'checking' | 'locked' | 'sending' | 'sent' | 'open'

function hasValidSessionCookie(): boolean {
  const raw = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${ACCESS_COOKIE}=`))
    ?.slice(ACCESS_COOKIE.length + 1)
  if (!raw) return false
  try {
    const body = decodeURIComponent(raw).split('.')[0]
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.k === 'session' && typeof payload.x === 'number' && payload.x > Date.now()
  } catch {
    return false
  }
}

export function AccessGate() {
  const [state, setState] = useState<GateState>('checking')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [devLink, setDevLink] = useState<string | null>(null)

  useEffect(() => {
    if (hasValidSessionCookie()) {
      setState('open')
      return
    }
    if (new URLSearchParams(window.location.search).get('login') === 'expired') {
      setNotice('That link expired or was already used. Enter your email for a fresh one.')
    }
    setState('locked')
  }, [])

  // Block background scroll while the gate is up.
  useEffect(() => {
    if (state === 'open' || state === 'checking') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [state])

  if (state === 'open' || state === 'checking') return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setState('sending')
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong. Please try again.')
        setState('locked')
        return
      }
      if (data?.devLink) setDevLink(data.devLink)
      setState('sent')
    } catch {
      setError('Network error. Please try again.')
      setState('locked')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-md print:hidden">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 p-8">
        <div className="mb-6">
          <div className="text-xl font-bold tracking-tight text-white">
            CuraVein<span className="text-[#5faaa6]">&trade;</span> Practice Development Model
          </div>
          <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
            Interactive pro forma for launching, acquiring, and scaling a venous disease clinic.
          </p>
        </div>

        {state === 'sent' ? (
          <div>
            <div className="flex items-center gap-2 text-[#5faaa6] font-semibold text-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Access link sent
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Check your inbox at <span className="text-white font-medium">{email}</span> and click the
              link to open the model. The link expires in 15 minutes.
            </p>
            {devLink && (
              <a href={devLink} className="block mt-3 text-xs text-[#5faaa6] underline break-all">
                [dev] open login link
              </a>
            )}
            <button
              onClick={() => setState('locked')}
              className="mt-4 text-xs text-gray-400 hover:text-gray-300 underline cursor-pointer"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label htmlFor="gate-email" className="block text-xs font-medium text-gray-400 mb-1.5">
              Work email
            </label>
            <input
              id="gate-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@firm.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#5faaa6] focus:ring-1 focus:ring-[#5faaa6]"
            />
            {notice && !error && <p className="mt-2 text-xs text-amber-400">{notice}</p>}
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={state === 'sending'}
              className="mt-4 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-950 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: '#5faaa6' }}
            >
              {state === 'sending' ? 'Sending…' : 'Email me a secure access link'}
            </button>
            <p className="mt-4 text-[11px] text-gray-500 leading-relaxed">
              Access is by verified email and lasts 30 days per device. Your address is used
              only for model access — no marketing lists.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
