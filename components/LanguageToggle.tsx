'use client'

import React from 'react'
import { Lang } from '@/lib/translations'

interface Props {
  lang: Lang
  onChange: (lang: Lang) => void
}

export default function LanguageToggle({ lang, onChange }: Props) {
  return (
    <div className="flex items-center rounded-lg overflow-hidden border border-dark-border">
      <button
        onClick={() => onChange('ar')}
        className={`px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
          lang === 'ar'
            ? 'bg-gold text-dark'
            : 'text-beige/60 hover:text-beige hover:bg-dark'
        }`}
        aria-label="Switch to Arabic"
      >
        عربي
      </button>
      <div className="w-px h-full bg-dark-border" />
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
          lang === 'en'
            ? 'bg-gold text-dark'
            : 'text-beige/60 hover:text-beige hover:bg-dark'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  )
}
