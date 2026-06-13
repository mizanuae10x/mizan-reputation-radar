import axios, { AxiosError } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? '/backend'
const API_V1 = `${BASE_URL}/api/v1`

const client = axios.create({
  baseURL: API_V1,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Entity {
  id: number
  name: string
  name_ar: string | null
  created_at: string
  is_active: boolean
}

export interface Mention {
  id: number
  entity_name: string
  source: string
  title: string
  url: string
  content: string | null
  sentiment_score: number | null
  sentiment_label: string | null
  sentiment_ar: string | null
  published_at: string | null
  created_at: string
}

export interface SentimentResult {
  score: number
  label: 'positive' | 'neutral' | 'negative'
  label_ar: string
  summary: string
  summary_ar: string
  key_themes: string[]
}

export interface Alert {
  id: number
  entity_name: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  is_read: boolean
  created_at: string
}

export interface SearchResponse {
  entity_name: string
  mentions: Mention[]
  sentiment: SentimentResult
  total: number
}

// Error normalizer
function normalizeError(err: unknown): string {
  if (err instanceof AxiosError) {
    return (
      err.response?.data?.detail ??
      err.response?.data?.message ??
      err.message ??
      'Unknown API error'
    )
  }
  if (err instanceof Error) return err.message
  return String(err)
}

// ── API Functions ───────────────────────────────────────────────────────────

export async function getEntities(): Promise<Entity[]> {
  try {
    const res = await client.get<Entity[]>('/entities')
    return res.data
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function addEntity(name: string, name_ar?: string): Promise<Entity> {
  try {
    const res = await client.post<Entity>('/entities', { name, name_ar })
    return res.data
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function searchEntity(query: string, max_results = 10): Promise<SearchResponse> {
  try {
    const res = await client.post<SearchResponse>('/search', { query, max_results })
    return res.data
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function getMentions(entityName: string, limit = 50): Promise<Mention[]> {
  try {
    const res = await client.get<Mention[]>(`/mentions/${encodeURIComponent(entityName)}`, {
      params: { limit },
    })
    return res.data
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function getSentiment(entityName: string): Promise<SentimentResult> {
  try {
    const res = await client.get<SentimentResult>(`/sentiment/${encodeURIComponent(entityName)}`)
    return res.data
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function generateReport(
  entityName: string,
  options: {
    language?: 'ar' | 'en' | 'both'
    date_from?: string
    date_to?: string
    include_summary?: boolean
  } = {}
): Promise<Blob> {
  try {
    const res = await client.post(
      `/report/${encodeURIComponent(entityName)}`,
      {
        entity_name: entityName,
        language: options.language ?? 'both',
        date_from: options.date_from,
        date_to: options.date_to,
        include_summary: options.include_summary ?? true,
      },
      { responseType: 'blob' }
    )
    return res.data as Blob
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function getAlerts(unreadOnly = false): Promise<Alert[]> {
  try {
    const res = await client.get<Alert[]>('/alerts', {
      params: { unread_only: unreadOnly },
    })
    return res.data
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function markAlertRead(alertId: number): Promise<void> {
  try {
    await client.patch(`/alerts/${alertId}/read`)
  } catch (err) {
    throw new Error(normalizeError(err))
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? '/backend'
    const res = await fetch(`${base}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}
