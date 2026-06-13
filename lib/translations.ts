export type Lang = 'ar' | 'en'

const translations: Record<string, Record<Lang, string>> = {
  // Navigation
  'nav.title': { ar: 'رادار السمعة', en: 'Reputation Radar' },
  'nav.subtitle': { ar: 'وزارة العدل الإماراتية', en: 'UAE Ministry of Justice' },
  'nav.alerts': { ar: 'التنبيهات', en: 'Alerts' },
  'nav.language': { ar: 'English', en: 'العربية' },

  // Dashboard
  'dashboard.welcome': { ar: 'مرحباً بكم في رادار السمعة', en: 'Welcome to Reputation Radar' },
  'dashboard.welcome_sub': {
    ar: 'مراقبة سمعة وزارة العدل الإماراتية في الوقت الفعلي',
    en: 'Real-time reputation monitoring for the UAE Ministry of Justice',
  },
  'dashboard.monitored_entities': { ar: 'الجهات المُراقَبة', en: 'Monitored Entities' },
  'dashboard.recent_mentions': { ar: 'أحدث الإشارات', en: 'Recent Mentions' },
  'dashboard.sentiment_trend': { ar: 'مسار المشاعر', en: 'Sentiment Trend' },
  'dashboard.alerts_panel': { ar: 'لوحة التنبيهات', en: 'Alerts Panel' },
  'dashboard.no_entities': { ar: 'لا توجد جهات مُراقَبة بعد', en: 'No entities being monitored yet' },
  'dashboard.loading': { ar: 'جارٍ التحميل…', en: 'Loading…' },
  'dashboard.error': { ar: 'حدث خطأ', en: 'An error occurred' },

  // Search
  'search.placeholder': { ar: 'أضف جهة لمراقبتها… مثال: وزارة العدل الإماراتية', en: 'Add entity to monitor… e.g. Ministry of Justice UAE' },
  'search.placeholder_ar': { ar: 'ابحث عن جهة…', en: 'Search for an entity…' },
  'search.button': { ar: 'إضافة للمراقبة', en: 'Add to Monitor' },
  'search.searching': { ar: 'جارٍ البحث…', en: 'Searching…' },
  'search.add_entity_ar': { ar: 'الاسم بالعربي (اختياري)', en: 'Arabic name (optional)' },

  // Entity Card
  'entity.view_details': { ar: 'عرض التفاصيل', en: 'View Details' },
  'entity.generate_report': { ar: 'إنشاء تقرير', en: 'Generate Report' },
  'entity.last_updated': { ar: 'آخر تحديث', en: 'Last updated' },
  'entity.mentions_24h': { ar: 'إشارة خلال 24 ساعة', en: 'mentions in 24h' },
  'entity.refresh': { ar: 'تحديث', en: 'Refresh' },
  'entity.no_mentions': { ar: 'لا توجد إشارات بعد', en: 'No mentions yet' },

  // Sentiment
  'sentiment.positive': { ar: 'إيجابي', en: 'Positive' },
  'sentiment.neutral': { ar: 'محايد', en: 'Neutral' },
  'sentiment.negative': { ar: 'سلبي', en: 'Negative' },
  'sentiment.score': { ar: 'درجة المشاعر', en: 'Sentiment Score' },
  'sentiment.summary': { ar: 'ملخص تحليل المشاعر', en: 'Sentiment Summary' },
  'sentiment.themes': { ar: 'المحاور الرئيسية', en: 'Key Themes' },

  // Alerts
  'alerts.title': { ar: 'التنبيهات', en: 'Alerts' },
  'alerts.mark_read': { ar: 'تحديد كمقروء', en: 'Mark as read' },
  'alerts.no_alerts': { ar: 'لا توجد تنبيهات', en: 'No alerts' },
  'alerts.critical': { ar: 'حرج', en: 'Critical' },
  'alerts.warning': { ar: 'تحذير', en: 'Warning' },
  'alerts.info': { ar: 'معلومة', en: 'Info' },
  'alerts.unread_only': { ar: 'غير المقروءة فقط', en: 'Unread only' },

  // Report
  'report.title': { ar: 'إنشاء تقرير PDF', en: 'Generate PDF Report' },
  'report.language': { ar: 'لغة التقرير', en: 'Report Language' },
  'report.language_ar': { ar: 'عربي فقط', en: 'Arabic only' },
  'report.language_en': { ar: 'إنجليزي فقط', en: 'English only' },
  'report.language_both': { ar: 'ثنائي اللغة', en: 'Bilingual' },
  'report.date_from': { ar: 'من تاريخ', en: 'From date' },
  'report.date_to': { ar: 'إلى تاريخ', en: 'To date' },
  'report.generate': { ar: 'تحميل التقرير', en: 'Download Report' },
  'report.generating': { ar: 'جارٍ الإنشاء…', en: 'Generating…' },
  'report.cancel': { ar: 'إلغاء', en: 'Cancel' },

  // Mentions
  'mention.source': { ar: 'المصدر', en: 'Source' },
  'mention.read_more': { ar: 'اقرأ المزيد', en: 'Read more' },
  'mention.no_mentions': { ar: 'لا توجد إشارات لعرضها', en: 'No mentions to display' },

  // Time
  'time.just_now': { ar: 'الآن', en: 'just now' },
  'time.minutes_ago': { ar: 'دقائق مضت', en: 'minutes ago' },
  'time.hours_ago': { ar: 'ساعات مضت', en: 'hours ago' },
  'time.days_ago': { ar: 'أيام مضت', en: 'days ago' },

  // Misc
  'misc.retry': { ar: 'إعادة المحاولة', en: 'Retry' },
  'misc.close': { ar: 'إغلاق', en: 'Close' },
  'misc.back': { ar: 'رجوع', en: 'Back' },
  'misc.powered_by': { ar: 'مدعوم بـ Claude AI', en: 'Powered by Claude AI' },
}

export function t(key: string, lang: Lang = 'ar'): string {
  const entry = translations[key]
  if (!entry) {
    console.warn(`Missing translation key: "${key}"`)
    return key
  }
  return entry[lang] ?? entry['en'] ?? key
}

export default translations
