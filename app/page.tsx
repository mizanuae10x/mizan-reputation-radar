'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  RefreshCw,
  BarChart2,
  Newspaper,
} from 'lucide-react'
import {
  getEntities,
  searchEntity,
  getMentions,
  getSentiment,
  Entity,
  Mention,
  SentimentResult,
} from '@/lib/api'
import { t, Lang } from '@/lib/translations'
import SearchBar from '@/components/SearchBar'
import EntityCard from '@/components/EntityCard'
import SentimentChart from '@/components/SentimentChart'
import MentionCard from '@/components/MentionCard'

// Read lang from nearest parent data attr (set by layout.tsx)
function useLang(): Lang {
  const [lang, setLang] = useState<Lang>('ar')
  useEffect(() => {
    function read() {
      const el = document.querySelector('[data-lang]')
      const val = el?.getAttribute('data-lang')
      if (val === 'ar' || val === 'en') setLang(val)
    }
    read()
    const obs = new MutationObserver(read)
    const target = document.querySelector('[data-lang]')
    if (target) obs.observe(target, { attributes: true })
    return () => obs.disconnect()
  }, [])
  return lang
}

interface EntityState {
  entity: Entity
  sentiment: SentimentResult | null
  mentions: Mention[]
  loading: boolean
}

export default function Dashboard() {
  const lang = useLang()
  const isRtl = lang === 'ar'

  const [entityStates, setEntityStates] = useState<EntityState[]>([])
  const [allMentions, setAllMentions] = useState<Mention[]>([])
  const [globalLoading, setGlobalLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  // Check backend health
  useEffect(() => {
    checkBackend()
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  async function checkBackend() {
    try {
      const res = await fetch('/backend/health')
      setBackendOnline(res.ok)
    } catch {
      setBackendOnline(false)
    }
  }

  // Load entities on mount
  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setGlobalLoading(true)
    setError(null)
    try {
      const entities = await getEntities()
      if (entities.length === 0) {
        setGlobalLoading(false)
        return
      }

      // Load mentions + sentiment for each entity
      const states = await Promise.all(
        entities.map(async (entity): Promise<EntityState> => {
          try {
            const [mentionData, sentimentData] = await Promise.all([
              getMentions(entity.name, 20),
              getSentiment(entity.name),
            ])
            return {
              entity,
              mentions: mentionData,
              sentiment: sentimentData,
              loading: false,
            }
          } catch {
            return { entity, mentions: [], sentiment: null, loading: false }
          }
        })
      )

      setEntityStates(states)

      // Combine all mentions for global feed
      const combined = states
        .flatMap((s) => s.mentions)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      setAllMentions(combined.slice(0, 30))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setGlobalLoading(false)
    }
  }

  async function handleSearch(query: string, queryAr?: string) {
    setSearchLoading(true)
    setError(null)
    try {
      const result = await searchEntity(query, 10)

      // Check if entity already exists in state
      const exists = entityStates.some((s) => s.entity.name === query)

      if (exists) {
        setEntityStates((prev) =>
          prev.map((s) =>
            s.entity.name === query
              ? {
                  ...s,
                  mentions: result.mentions as Mention[],
                  sentiment: result.sentiment,
                }
              : s
          )
        )
      } else {
        // Reload entities to get the new one with its DB id
        const entities = await getEntities()
        const newEntity = entities.find((e) => e.name === query)
        if (newEntity) {
          const newState: EntityState = {
            entity: { ...newEntity, name_ar: queryAr ?? newEntity.name_ar },
            mentions: result.mentions as Mention[],
            sentiment: result.sentiment,
            loading: false,
          }
          setEntityStates((prev) => [newState, ...prev])
        }
      }

      // Update global mentions feed
      const newMentions = result.mentions as Mention[]
      setAllMentions((prev) => {
        const combined = [...newMentions, ...prev.filter((m) => m.entity_name !== query)]
        return combined
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 30)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchLoading(false)
    }
  }

  // Stats summary
  const totalMentions = allMentions.length
  const avgSentiment =
    entityStates.length > 0
      ? entityStates.reduce((sum, s) => sum + (s.sentiment?.score ?? 0), 0) /
        entityStates.length
      : null
  const unreadAlerts = 0 // fetched in layout

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Backend status banner ─────────────────────────────────────────── */}
      {backendOnline === false && (
        <div className="flex items-center gap-3 p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm animate-fade-in">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>
            {lang === 'ar'
              ? 'الخادم الخلفي غير متصل — تشغيل بدون اتصال بالخادم'
              : 'Backend offline — running in offline mode. Start the FastAPI server to enable live data.'}
          </span>
        </div>
      )}

      {backendOnline === true && (
        <div className="flex items-center gap-2 p-2 bg-green-950/30 border border-green-800/40 rounded-lg text-green-400 text-xs animate-fade-in">
          <Wifi className="w-3 h-3" />
          <span>{lang === 'ar' ? 'الخادم متصل' : 'Backend online'}</span>
        </div>
      )}

      {/* ── Welcome banner ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-card via-dark-card to-dark border border-dark-border p-6">
        {/* Decorative gold orb */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gold/5 rounded-full blur-xl" />

        <div className={`relative ${isRtl ? 'text-right' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 font-medium">
              {lang === 'ar' ? 'مباشر' : 'LIVE'}
            </span>
            <span className="text-xs text-beige/30">
              {lang === 'ar' ? '24/7 مراقبة مستمرة' : 'Continuous 24/7 monitoring'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-beige mb-1">
            {t('dashboard.welcome', lang)}
          </h1>
          <p className="text-beige/50 text-sm">
            {t('dashboard.welcome_sub', lang)}
          </p>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          value={entityStates.length.toString()}
          label={lang === 'ar' ? 'جهة مُراقَبة' : 'Monitored Entities'}
          color="text-gold"
        />
        <StatCard
          icon={<Newspaper className="w-5 h-5" />}
          value={totalMentions.toString()}
          label={lang === 'ar' ? 'إشارة حديثة' : 'Recent Mentions'}
          color="text-blue-400"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          value={
            avgSentiment !== null
              ? (avgSentiment >= 0 ? '+' : '') + avgSentiment.toFixed(2)
              : '—'
          }
          label={lang === 'ar' ? 'متوسط المشاعر' : 'Avg Sentiment'}
          color={
            avgSentiment === null
              ? 'text-beige/40'
              : avgSentiment >= 0.2
              ? 'text-green-400'
              : avgSentiment <= -0.2
              ? 'text-red-400'
              : 'text-yellow-400'
          }
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          value={lang === 'ar' ? 'نشط' : 'Active'}
          label={lang === 'ar' ? 'حالة النظام' : 'System Status'}
          color="text-green-400"
        />
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className={`text-sm font-bold text-gold mb-3 ${isRtl ? 'text-right' : ''}`}>
          {lang === 'ar' ? 'إضافة جهة للمراقبة' : 'Add Entity to Monitor'}
        </h2>
        <SearchBar lang={lang} onSearch={handleSearch} loading={searchLoading} />
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity cards (left 2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-sm font-bold text-gold">
              {t('dashboard.monitored_entities', lang)}
            </h2>
            <button
              onClick={loadDashboard}
              disabled={globalLoading}
              className="flex items-center gap-1.5 text-xs text-beige/40 hover:text-gold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${globalLoading ? 'animate-spin' : ''}`} />
              {lang === 'ar' ? 'تحديث الكل' : 'Refresh all'}
            </button>
          </div>

          {globalLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="card">
                  <div className="skeleton h-5 w-48 mb-3" />
                  <div className="skeleton h-2 w-full mb-2" />
                  <div className="skeleton h-3 w-32 mb-4" />
                  <div className="flex gap-2">
                    <div className="skeleton h-9 flex-1 rounded-lg" />
                    <div className="skeleton h-9 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : entityStates.length === 0 ? (
            <div className="card text-center py-12">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 text-beige/20" />
              <p className="text-beige/40 text-sm">{t('dashboard.no_entities', lang)}</p>
              <p className="text-beige/25 text-xs mt-1">
                {lang === 'ar'
                  ? 'استخدم شريط البحث أعلاه لإضافة جهة'
                  : 'Use the search bar above to add an entity'}
              </p>
            </div>
          ) : (
            entityStates.map(({ entity, sentiment, mentions }) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                lang={lang}
                initialSentiment={sentiment}
                initialMentions={mentions}
              />
            ))
          )}
        </div>

        {/* Right panel: chart + mentions feed */}
        <div className="space-y-4">
          {/* Sentiment trend chart */}
          {allMentions.length > 0 && (
            <div className="card">
              <h2 className={`text-sm font-bold text-gold mb-3 ${isRtl ? 'text-right' : ''}`}>
                {t('dashboard.sentiment_trend', lang)}
              </h2>
              <SentimentChart mentions={allMentions} lang={lang} height={200} />
            </div>
          )}

          {/* Recent mentions feed */}
          <div className="card">
            <h2 className={`text-sm font-bold text-gold mb-3 ${isRtl ? 'text-right' : ''}`}>
              {t('dashboard.recent_mentions', lang)}
            </h2>
            {allMentions.length === 0 ? (
              <p className="text-center text-beige/30 text-sm py-6">
                {t('mention.no_mentions', lang)}
              </p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {allMentions.slice(0, 15).map((m) => (
                  <MentionCard key={m.id} mention={m} lang={lang} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string
  label: string
  color: string
}) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`flex-shrink-0 ${color} opacity-70`}>{icon}</div>
      <div className="min-w-0">
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-[11px] text-beige/40 truncate">{label}</div>
      </div>
    </div>
  )
}
