import { NextRequest, NextResponse } from 'next/server'
import { signToken, LOGIN_TOKEN_TTL_MS } from '@/lib/gate'

/**
 * POST /api/auth/request  { email }
 *
 * Sends a magic login link via Resend and notifies NOTIFY_EMAIL of the
 * access request (investor lead capture). Best-effort per-instance
 * throttle: one link per email per 60s.
 *
 * Env:
 *   AUTH_SECRET      — HMAC secret (required)
 *   RESEND_API_KEY   — Resend API key (required in production)
 *   EMAIL_FROM       — verified sender, default 'CuraVein <login@curavein.app>'
 *   NOTIFY_EMAIL     — where access-request notifications go (optional)
 *
 * Dev fallback: with no RESEND_API_KEY outside production, the response
 * includes the login link directly so the flow is testable locally.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Per-serverless-instance throttle. Not durable, not distributed — fine for
// abuse dampening on a lead-capture form.
const lastSent = new Map<string, number>()

function loginEmailHtml(link: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:#0b1220;padding:20px 28px;">
      <span style="color:#5faaa6;font-size:18px;font-weight:700;letter-spacing:-0.01em;">CuraVein&trade;</span>
      <span style="color:#94a3b8;font-size:12px;margin-left:8px;">Practice Development Model</span>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#111827;">Your secure access link</p>
      <p style="margin:0 0 20px;font-size:13px;color:#4b5563;line-height:1.5;">
        Click below to open the interactive pro forma. This link expires in 15 minutes
        and grants access on this device for 30 days.
      </p>
      <a href="${link}" style="display:inline-block;background:#4a8c89;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px;">
        Open the CuraVein Model
      </a>
      <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;line-height:1.5;">
        If the button doesn't work, paste this URL into your browser:<br/>
        <span style="word-break:break-all;color:#6b7280;">${link}</span><br/><br/>
        If you didn't request this, you can ignore this email.
      </p>
    </div>
  </div>
</body></html>`
}

async function sendViaResend(apiKey: string, payload: Record<string, unknown>): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function POST(req: NextRequest) {
  let email: string
  try {
    const body = await req.json()
    email = String(body?.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const now = Date.now()
  const last = lastSent.get(email) ?? 0
  if (now - last < 60_000) {
    return NextResponse.json({ error: 'A link was just sent. Check your inbox (and spam), or retry in a minute.' }, { status: 429 })
  }

  const token = signToken({ e: email, x: now + LOGIN_TOKEN_TTL_MS, k: 'login' })
  const link = `${req.nextUrl.origin}/api/auth/verify?token=${encodeURIComponent(token)}`

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      // Local/dev escape hatch — surface the link so the flow is testable
      // without an email provider. Never active in production builds.
      console.log(`[auth/request] DEV login link for ${email}: ${link}`)
      return NextResponse.json({ ok: true, devLink: link })
    }
    console.error('[auth/request] RESEND_API_KEY is not set in production.')
    return NextResponse.json({ error: 'Email service is not configured. Please contact info@curavein.com.' }, { status: 500 })
  }

  const from = process.env.EMAIL_FROM ?? 'CuraVein <login@curavein.app>'

  const sendRes = await sendViaResend(apiKey, {
    from,
    to: [email],
    subject: 'Your CuraVein model access link',
    html: loginEmailHtml(link),
  })

  if (!sendRes.ok) {
    const detail = await sendRes.text().catch(() => '')
    console.error(`[auth/request] Resend send failed (${sendRes.status}): ${detail}`)
    return NextResponse.json({ error: 'Could not send the login email. Please try again.' }, { status: 502 })
  }

  lastSent.set(email, now)

  // Lead-capture notification — non-blocking semantics: failures are logged,
  // never surfaced to the requester.
  const notifyTo = process.env.NOTIFY_EMAIL
  if (notifyTo) {
    try {
      const notifyRes = await sendViaResend(apiKey, {
        from,
        to: [notifyTo],
        subject: `Model access request: ${email}`,
        html: `<p><strong>${email}</strong> requested access to the CuraVein model.</p><p style="font-size:12px;color:#6b7280;">${new Date().toISOString()}</p>`,
      })
      if (!notifyRes.ok) console.error(`[auth/request] notify send failed (${notifyRes.status})`)
    } catch (err) {
      console.error('[auth/request] notify send threw:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
