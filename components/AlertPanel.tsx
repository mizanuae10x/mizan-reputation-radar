'use client'

import React, { useState } from 'react'
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { Alert, markAlertRead } from '@/lib/api'
import { t, Lang } from '@/lib/translations'
import { clsx } from 'clsx'

interface Props {
  alerts: Alert[]
  lang: Lang
  onMarkRead: (id: number) => void
  onClose: () => void
}

function timeAgo(dateStr: string, lang: Lang): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return t('time.just_now', lang)
  if (mins < 60) return `${mins} ${t('time.minutes_ago', lang)}`
  if (hours < 24) return `${hours} ${t('time.hours_ago', lang)}`
  return `${days} ${t('time.days_ago', lang)}`
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === 'critical') return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
  if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
}

export default function AlertPanel({ alerts, lang, onMarkRead, onClose }: Props) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const isRtl = lang === 'ar'

  const displayed = unreadOnly ? alerts.filter((a) => !a.is_read) : alerts

  async function handleMarkRead(id: number) {
    try {
      await markAlertRead(id)
      onMarkRead(id)
    } catch {
      // ignore
    }
  }

  return (
    <div className="card shadow-2xl animate-slide-up" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-gold font-bold text-base">{t('alerts.title', lang)}</h3>
        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <label className="flex items-center gap-1.5 text-xs text-beige/50 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="accent-gold"
            />
            {t('alerts.unread_only', lang)}
          </label>
          <button
            onClick={onClose}
            className="text-beige/40 hover:text-beige transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {displayed.length === 0 ? (
          <div className="text-center py-8 text-beige/30">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-700" />
            <p className="text-sm">{t('alerts.no_alerts', lang)}</p>
          </div>
        ) : (
          displayed.map((alert) => (
            <div
              key={alert.id}
              className={clsx(
                'flex gap-3 p-3 rounded-lg border transition-all',
                isRtl ? 'flex-row-reverse text-right' : '',
                alert.is_read
                  ? 'border-dark-border bg-dark/40 opacity-60'
                  : alert.severity === 'critical'
                  ? 'border-red-800 bg-red-950/30'
                  : alert.severity === 'warning'
                  ? 'border-yellow-800 bg-yellow-950/20'
                  : 'border-blue-800 bg-blue-950/20'
              )}
            >
              <SeverityIcon severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <div className={`flex items-start gap-2 mb-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className={`badge-${alert.severity}`}>
                    {t(`alerts.${alert.severity}` as any, lang)}
                  </span>
                  <span className="text-beige/40 text-xs flex-shrink-0">
                    {timeAgo(alert.created_at, lang)}
                  </span>
                </div>
                <p className="text-xs text-beige/80 leading-relaxed line-clamp-2">
                  {alert.message}
                </p>
                {!alert.is_read && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="mt-1.5 text-xs text-gold/70 hover:text-gold underline"
                  >
                    {t('alerts.mark_read', lang)}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
