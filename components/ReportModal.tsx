'use client'

import React, { useState } from 'react'
import { X, Download, Loader2, FileText } from 'lucide-react'
import { generateReport } from '@/lib/api'
import { t, Lang } from '@/lib/translations'

interface Props {
  entityName: string
  lang: Lang
  onClose: () => void
}

export default function ReportModal({ entityName, lang, onClose }: Props) {
  const [reportLang, setReportLang] = useState<'ar' | 'en' | 'both'>('both')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isRtl = lang === 'ar'

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const blob = await generateReport(entityName, {
        language: reportLang,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        include_summary: true,
      })
      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = entityName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_؀-ۿ]/g, '')
      a.download = `mizan_report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-beige">{t('report.title', lang)}</h2>
              <p className="text-xs text-beige/40">{entityName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-beige/40 hover:text-beige transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language selector */}
        <div className="mb-4">
          <label className="block text-xs text-beige/60 mb-2">
            {t('report.language', lang)}
          </label>
          <div className="flex gap-2">
            {(['ar', 'en', 'both'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setReportLang(l)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  reportLang === l
                    ? 'bg-gold text-dark border-gold'
                    : 'border-dark-border text-beige/60 hover:border-gold/40 hover:text-beige'
                }`}
              >
                {l === 'ar'
                  ? t('report.language_ar', lang)
                  : l === 'en'
                  ? t('report.language_en', lang)
                  : t('report.language_both', lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className={`grid grid-cols-2 gap-3 mb-6 ${isRtl ? 'direction-ltr' : ''}`}>
          <div>
            <label className="block text-xs text-beige/60 mb-1.5">
              {t('report.date_from', lang)}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-gold text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs text-beige/60 mb-1.5">
              {t('report.date_to', lang)}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-gold text-sm"
              dir="ltr"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800 rounded-lg text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-gold flex-1 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('report.generating', lang)}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('report.generate', lang)}
              </>
            )}
          </button>
          <button onClick={onClose} className="btn-outline-gold">
            {t('report.cancel', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
