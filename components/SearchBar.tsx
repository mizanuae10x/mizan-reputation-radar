'use client'

import React, { useState } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import { t, Lang } from '@/lib/translations'

interface Props {
  lang: Lang
  onSearch: (query: string, queryAr?: string) => Promise<void>
  loading?: boolean
}

export default function SearchBar({ lang, onSearch, loading = false }: Props) {
  const [query, setQuery] = useState('')
  const [queryAr, setQueryAr] = useState('')
  const [showAr, setShowAr] = useState(false)
  const isRtl = lang === 'ar'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    await onSearch(q, queryAr.trim() || undefined)
    setQuery('')
    setQueryAr('')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-beige/30 ${
              isRtl ? 'right-3' : 'left-3'
            }`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder', lang)}
            className={`input-gold ${isRtl ? 'pr-9 text-right' : 'pl-9'}`}
            disabled={loading}
            dir="auto"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-gold flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {loading ? t('search.searching', lang) : t('search.button', lang)}
          </span>
        </button>
      </div>

      {/* Optional Arabic name input */}
      <button
        type="button"
        onClick={() => setShowAr(!showAr)}
        className="mt-2 text-xs text-gold/50 hover:text-gold/80 underline"
      >
        {showAr ? '− ' : '+ '}
        {t('search.add_entity_ar', lang)}
      </button>

      {showAr && (
        <input
          type="text"
          value={queryAr}
          onChange={(e) => setQueryAr(e.target.value)}
          placeholder={t('search.add_entity_ar', lang)}
          className="input-gold mt-2 text-right"
          dir="rtl"
          disabled={loading}
        />
      )}
    </form>
  )
}
