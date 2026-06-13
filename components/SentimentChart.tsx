'use client'

import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Mention } from '@/lib/api'
import { Lang } from '@/lib/translations'

interface Props {
  mentions: Mention[]
  lang: Lang
  height?: number
}

interface DataPoint {
  label: string
  score: number
  fill: string
}

function formatDate(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  try {
    return date.toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return date.toISOString().slice(5, 10)
  }
}

function scoreColor(score: number): string {
  if (score >= 0.2) return '#22C55E'
  if (score <= -0.2) return '#EF4444'
  return '#F59E0B'
}

const CustomTooltip = ({
  active,
  payload,
  label,
  lang,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  lang: Lang
}) => {
  if (!active || !payload?.length) return null
  const score = payload[0]?.value as number
  const color = scoreColor(score)
  return (
    <div className="bg-dark-card border border-gold/30 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-beige/50 text-xs mb-1">{label}</p>
      <p className="font-bold text-sm" style={{ color }}>
        {score >= 0 ? '+' : ''}
        {score.toFixed(3)}
      </p>
      <p className="text-xs text-beige/40">
        {score >= 0.2
          ? lang === 'ar'
            ? 'إيجابي'
            : 'Positive'
          : score <= -0.2
          ? lang === 'ar'
            ? 'سلبي'
            : 'Negative'
          : lang === 'ar'
          ? 'محايد'
          : 'Neutral'}
      </p>
    </div>
  )
}

export default function SentimentChart({ mentions, lang, height = 220 }: Props) {
  const data = useMemo<DataPoint[]>(() => {
    const withScore = mentions
      .filter((m) => m.sentiment_score !== null && m.created_at)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

    // Group by day and average
    const byDay: Record<string, number[]> = {}
    for (const m of withScore) {
      const day = m.created_at.slice(0, 10)
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(m.sentiment_score as number)
    }

    return Object.entries(byDay).map(([day, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      return {
        label: formatDate(day, lang),
        score: parseFloat(avg.toFixed(3)),
        fill: scoreColor(avg),
      }
    })
  }, [mentions, lang])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-beige/30 text-sm"
        style={{ height }}
      >
        {lang === 'ar' ? 'لا توجد بيانات كافية للرسم البياني' : 'Not enough data for chart'}
      </div>
    )
  }

  // Use gradient stops based on overall sentiment
  const overallAvg = data.reduce((a, b) => a + b.score, 0) / data.length
  const gradientColor = scoreColor(overallAvg)

  return (
    <div dir="ltr"> {/* recharts is always LTR */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2d3139' }}
          />
          <YAxis
            domain={[-1, 1]}
            tickCount={5}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (v >= 0 ? `+${v}` : `${v}`)}
          />
          <Tooltip content={<CustomTooltip lang={lang} />} />
          <ReferenceLine
            y={0}
            stroke="#D4AF37"
            strokeDasharray="4 4"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={gradientColor}
            strokeWidth={2.5}
            fill="url(#sentimentGrad)"
            dot={{ fill: gradientColor, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
