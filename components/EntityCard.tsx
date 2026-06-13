'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, RefreshCw, FileText, TrendingUp, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { Entity, Mention, SentimentResult, getMentions, searchEntity } from '@/lib/api'
import { t, Lang } from '@/lib/translations'
import MentionCard from './MentionCard'
import ReportModal from './ReportModal'

interface Props {
  entity: Entity
  lang: Lang
  initialSentiment?: SentimentResult | null
  initialMentions?: Mention[]
}

function scoreToPercent(score: number): number {
  return Math.round(((score + 1) / 2) * 100)
}

function SentimentGauge({ score, label }: { score: number; label: string }) {
  const pct = scoreToPercent(score)
  const color =
    score >= 0.2
      ? '#22C55E'
      : score <= -0.2
      ? '#EF4444'
      : '#F59E0B'

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-beige/40">-1</span>
        <span className="text-xs font-bold" style={{ color }}>
          {score >= 0 ? '+' : ''}
          {score.toFixed(3)}
        </span>
        <span className="text-xs text-beige/40">+1</span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
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

export default function EntityCard({
  entity,
  lang,
  initialSentiment,
  initialMentions = [],
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [mentions, setMentions] = useState<Mention[]>(initialMentions)
  const [sentiment, setSentiment] = useState<SentimentResult | null>(initialSentiment ?? null)
  const [refreshing, setRefreshing] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString())
  const isRtl = lang === 'ar'

  const mentionsLast24h = mentions.filter((m) => {
    if (!m.created_at) return false
    return Date.now() - new Date(m.created_at).getTime() < 86400000
  }).length

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const result = await searchEntity(entity.name, 10)
      setMentions(result.mentions as Mention[])
      setSentiment(result.sentiment)
      setLastUpdated(new Date().toISOString())
    } catch {
      // Silent fail
    } finally {
      setRefreshing(false)
    }
  }

  async function handleExpand() {
    const willExpand = !expanded
    setExpanded(willExpand)
    if (willExpand && mentions.length === 0) {
      try {
        const data = await getMentions(entity.name, 20)
        setMentions(data)
      } catch {
        // ignore
      }
    }
  }

  const sentimentScore = sentiment?.score ?? 0
  const sentimentLabel = sentiment
    ? lang === 'ar'
      ? sentiment.label_ar
      : sentiment.label
    : '—'

  const scoreColor =
    sentimentScore >= 0.2
      ? 'text-green-400'
      : sentimentScore <= -0.2
      ? 'text-red-400'
      : 'text-yellow-400'

  const borderColor =
    sentimentScore >= 0.2
      ? 'border-green-800/40'
      : sentimentScore <= -0.2
      ? 'border-red-800/40'
      : 'border-yellow-800/40'

  return (
    <>
      <div
        className={`card border ${borderColor} hover:border-gold/30 transition-all duration-300 animate-slide-up`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Top row */}
        <div className={`flex items-start justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {/* Entity name */}
          <div className="flex-1 min-w-0">
            <h3
              className={`font-bold text-base text-beige leading-tight truncate ${isRtl ? 'text-right' : ''}`}
            >
              {lang === 'ar' && entity.name_ar ? entity.name_ar : entity.name}
            </h3>
            {entity.name_ar && lang !== 'ar' && (
              <p className="text-xs text-beige/40 text-arabic mt-0.5">{entity.name_ar}</p>
            )}
            {entity.name_ar && lang === 'ar' && (
              <p className="text-xs text-beige/40 mt-0.5">{entity.name}</p>
            )}
          </div>

          {/* Score badge */}
          {sentiment && (
            <div
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-xl border text-center',
                sentimentScore >= 0.2
                  ? 'bg-green-950/40 border-green-700 text-green-400'
                  : sentimentScore <= -0.2
                  ? 'bg-red-950/40 border-red-700 text-red-400'
                  : 'bg-yellow-950/40 border-yellow-700 text-yellow-400'
              )}
            >
              <div className="text-lg font-bold leading-none">
                {sentimentScore >= 0 ? '+' : ''}
                {sentimentScore.toFixed(2)}
              </div>
              <div className="text-[10px] mt-0.5 opacity-80">{sentimentLabel}</div>
            </div>
          )}
        </div>

        {/* Gauge */}
        {sentiment && (
          <div className="mt-3">
            <SentimentGauge score={sentimentScore} label={sentimentLabel} />
          </div>
        )}

        {/* Meta info */}
        <div
          className={`flex items-center gap-3 mt-3 text-xs text-beige/40 ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <span className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="w-3 h-3" />
            {mentionsLast24h} {t('entity.mentions_24h', lang)}
          </span>
          <span className="text-beige/20">·</span>
          <span className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Clock className="w-3 h-3" />
            {t('entity.last_updated', lang)}: {timeAgo(lastUpdated, lang)}
          </span>
        </div>

        {/* Sentiment summary */}
        {sentiment?.summary && !expanded && (
          <p
            className={`mt-3 text-xs text-beige/60 leading-relaxed line-clamp-2 ${isRtl ? 'text-right' : ''}`}
          >
            {lang === 'ar' ? sentiment.summary_ar : sentiment.summary}
          </p>
        )}

        {/* Key themes */}
        {sentiment?.key_themes && sentiment.key_themes.length > 0 && !expanded && (
          <div className={`flex flex-wrap gap-1.5 mt-3 ${isRtl ? 'justify-end' : ''}`}>
            {sentiment.key_themes.slice(0, 4).map((theme, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold/70 border border-gold/20"
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div
          className={`flex items-center gap-2 mt-4 ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <button
            onClick={handleExpand}
            className="btn-outline-gold flex items-center gap-1.5 text-sm flex-1 justify-center"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {lang === 'ar' ? 'إخفاء' : 'Collapse'}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('entity.view_details', lang)}
              </>
            )}
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="btn-gold flex items-center gap-1.5 text-sm"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{t('entity.generate_report', lang)}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-dark-border text-beige/40 hover:text-gold hover:border-gold/30 transition-colors"
            title={t('entity.refresh', lang)}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Expanded mentions */}
        {expanded && (
          <div className="mt-4 space-y-2 animate-fade-in">
            <div className={`flex items-center justify-between text-xs text-beige/40 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span>{mentions.length} {lang === 'ar' ? 'إشارة' : 'mentions'}</span>
              {sentiment && (
                <div>
                  <p className={`text-xs text-beige/60 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
                    {lang === 'ar' ? sentiment.summary_ar : sentiment.summary}
                  </p>
                  {sentiment.key_themes.length > 0 && (
                    <div className={`flex flex-wrap gap-1.5 mt-2 ${isRtl ? 'justify-end' : ''}`}>
                      {sentiment.key_themes.map((theme, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold/70 border border-gold/20"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {mentions.length === 0 ? (
              <p className="text-center text-beige/30 text-sm py-4">
                {t('entity.no_mentions', lang)}
              </p>
            ) : (
              mentions.slice(0, 10).map((m) => (
                <MentionCard key={m.id} mention={m} lang={lang} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Report modal */}
      {showReport && (
        <ReportModal
          entityName={entity.name}
          lang={lang}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  )
}
