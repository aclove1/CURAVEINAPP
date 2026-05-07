'use client'

import { Sidebar } from './Sidebar'
import { Backdrop } from './Backdrop'
import { UIStateProvider } from './UIStateContext'

/**
 * AppShell
 *
 * The client-side layout wrapper. Owns nothing visually itself — just
 * mounts the UIStateProvider, the responsive Sidebar, the Backdrop, and
 * renders the page's main content.
 *
 * Why this is a separate client component:
 * Next.js's RootLayout (app/layout.tsx) is a server component. The drawer
 * open/close state has to live in a client component. AppShell is the
 * smallest possible client island that wraps the layout chrome.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <UIStateProvider>
      <div className="flex min-h-[100dvh]">
        <Sidebar />
        <Backdrop />
        <main className="flex-1 overflow-auto min-w-0">
          {children}
        </main>
      </div>
    </UIStateProvider>
  )
}
