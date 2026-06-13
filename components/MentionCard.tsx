'use client'

import React from 'react'
import { ExternalLink, Globe } from 'lucide-react'
import { clsx } from 'clsx'
import { Mention } from '@/lib/api'
import { t, Lang } from '@/lib/translations'

interface Props {
  mention: Mention
  lang: Lang
}

function timeAgo(dateStr: string | null, lang: Lang): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return t('time.just_now', lang)
  if (mins < 60) return `${mins} ${t('time.minutes_ago', lang)}`
  if (hours < 24) return `${hours} ${t('time.hours_ago', lang)}`
  return `${days} ${t('time.days_ago', lang)}`
}

function sentimentBadge(label: string | null, labelAr: string | null, lang: Lang) {
  if (!label) return null
  const display = lang === 'ar' && labelAr ? labelAr : label
  return <span className={`badge-${label.toLowerCase()}`}>{display}</span>
}

export default function MentionCard({ mention, lang }: Props) {
  const isRtl = lang === 'ar'
  const isArabicTitle = /[؀-ۿ]/.test(mention.title)

  return (
    <div className="card hover:border-gold/30 transition-all duration-200 animate-fade-in">
      <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        {/* Source icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-dark border border-dark-border flex items-center justify-center">
          <Globe className="w-4 h-4 text-beige/30" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: source + time + sentiment */}
          <div
            className={`flex items-center gap-2 mb-1 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}
          >
            <span className="text-gold text-xs font-medium truncate">
              {mention.source}
            </span>
            <span className="text-beige/30 text-xs">·</span>
            <span className="text-beige/40 text-xs flex-shrink-0">
              {timeAgo(mention.created_at, lang)}
            </span>
            {sentimentBadge(mention.sentiment_label, mention.sentiment_ar, lang)}
          </div>

          {/* Title */}
          <h4
            className={clsx(
              'text-sm font-medium text-beige leading-snug mb-1 line-clamp-2',
              isArabicTitle || isRtl ? 'text-right' : 'text-left'
            )}
            dir={isArabicTitle ? 'rtl' : 'ltr'}
          >
            {mention.title}
          </h4>

          {/* Content snippet */}
          {mention.content && (
            <p
              className={clsx(
                'text-xs text-beige/50 line-clamp-2 leading-relaxed',
                isArabicTitle || isRtl ? 'text-right' : 'text-left'
              )}
              dir={isArabicTitle ? 'rtl' : 'ltr'}
            >
              {mention.content}
            </p>
          )}

          {/* Read more link */}
          <a
            href={mention.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 mt-1.5 text-xs text-gold/60 hover:text-gold transition-colors ${
              isRtl ? 'flex-row-reverse' : ''
            }`}
          >
            {t('mention.read_more', lang)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Score bubble */}
        {mention.sentiment_score !== null && (
          <div
            className={clsx(
              'flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold',
              mention.sentiment_score >= 0.2
                ? 'border-green-600 text-green-400 bg-green-950/30'
                : mention.sentiment_score <= -0.2
                ? 'border-red-600 text-red-400 bg-red-950/30'
                : 'border-yellow-600 text-yellow-400 bg-yellow-950/30'
            )}
          >
            {mention.sentiment_score >= 0 ? '+' : ''}
            {mention.sentiment_score.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )
}
