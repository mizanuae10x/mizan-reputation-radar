'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { getAlerts } from '@/lib/api'
import type { Alert } from '@/lib/api'
import { t, Lang } from '@/lib/translations'
import LanguageToggle from '@/components/LanguageToggle'
import AlertPanel from '@/components/AlertPanel'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [lang, setLang] = useState<Lang>('ar')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [dir, setDir] = useState<'rtl' | 'ltr'>('rtl')

  const unreadCount = alerts.filter((a) => !a.is_read).length

  useEffect(() => {
    setDir(lang === 'ar' ? 'rtl' : 'ltr')
  }, [lang])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  async function fetchAlerts() {
    try {
      const data = await getAlerts()
      setAlerts(data)
    } catch {
      // Backend may not be running; ignore silently
    }
  }

  function handleAlertRead(id: number) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    )
  }

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>رادار السمعة | Mizan Reputation Radar</title>
        <meta name="description" content="Real-time reputation monitoring for UAE Ministry of Justice" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-dark text-beige min-h-screen">
        {/* ── Navigation Bar ─────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-40 bg-dark-card border-b border-dark-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo + Title */}
              <div className={`flex items-center gap-3 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
                {/* Mizan Logo mark */}
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gold flex items-center justify-center">
                  <span className="text-dark font-bold text-lg leading-none">م</span>
                </div>
                <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                  <div className="text-gold font-bold text-base leading-tight">
                    {t('nav.title', lang)}
                  </div>
                  <div className="text-beige/50 text-xs leading-tight">
                    {t('nav.subtitle', lang)}
                  </div>
                </div>
              </div>

              {/* Right controls */}
              <div className={`flex items-center gap-3 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
                <LanguageToggle lang={lang} onChange={setLang} />

                {/* Alert bell */}
                <button
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="relative p-2 rounded-lg hover:bg-dark transition-colors"
                  aria-label={t('nav.alerts', lang)}
                >
                  <Bell className="w-5 h-5 text-beige/70" />
                  {unreadCount > 0 && (
                    <span className="notification-dot">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Alert Panel Drawer ─────────────────────────────────────────── */}
        {showAlerts && (
          <div className="fixed inset-0 z-30" onClick={() => setShowAlerts(false)}>
            <div
              className={`absolute top-16 ${lang === 'ar' ? 'left-4' : 'right-4'} w-96 max-h-[80vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <AlertPanel
                alerts={alerts}
                lang={lang}
                onMarkRead={handleAlertRead}
                onClose={() => setShowAlerts(false)}
              />
            </div>
          </div>
        )}

        {/* ── Page Content ───────────────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Pass lang via context workaround – children receive it via prop drilling or context */}
          {/* We use a data attribute on <main> that child components can read if needed */}
          <div data-lang={lang} data-dir={dir}>
            {/* Inject lang into children via cloneElement pattern */}
            {children}
          </div>
        </main>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-dark-border mt-12 py-4 text-center text-beige/30 text-xs">
          {t('misc.powered_by', lang)} &nbsp;·&nbsp; رادار السمعة – ميزان &nbsp;·&nbsp; وزارة العدل الإماراتية
        </footer>
      </body>
    </html>
  )
}
