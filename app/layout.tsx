import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://curavein.app'),
  title: {
    default: 'CuraVein™ — Love Your Legs',
    template: '%s · CuraVein™',
  },
  description:
    'Physician-owned vein & vascular platform. v12 Integrated Financial Model — Excel-aligned proforma for investor review.',
  applicationName: 'CuraVein',
  authors: [{ name: 'Aaron C. Love, DO' }],
  keywords: ['vein clinic', 'CVI', 'VenaSeal', 'RFA', 'Varithena', 'Central Texas', 'New Braunfels'],
  openGraph: {
    title: 'CuraVein™ — Love Your Legs',
    description: 'Physician-owned vein & vascular platform. Central Texas.',
    url: 'https://curavein.app',
    siteName: 'CuraVein',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CuraVein™ — Love Your Legs',
    description: 'Physician-owned vein & vascular platform.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Cloudflare Insights beacon — preconnect cuts ~30-50ms off the first request */}
        <link rel="preconnect" href="https://static.cloudflareinsights.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://static.cloudflareinsights.com" />
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-[100dvh]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
