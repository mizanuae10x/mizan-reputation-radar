from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Entity(BaseModel):
    id: int
    name: str
    name_ar: Optional[str] = None
    created_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True


class Mention(BaseModel):
    id: int
    entity_name: str
    source: str
    title: str
    url: str
    content: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    sentiment_ar: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Alert(BaseModel):
    id: int
    entity_name: str
    message: str
    severity: str  # "critical" | "warning" | "info"
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class SentimentResult(BaseModel):
    score: float = Field(..., ge=-1, le=1)
    label: str  # "positive" | "neutral" | "negative"
    label_ar: str  # "إيجابي" | "محايد" | "سلبي"
    summary: str
    summary_ar: str
    key_themes: List[str] = []


class ReportRequest(BaseModel):
    entity_name: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    include_summary: bool = True
    language: str = "both"  # "ar" | "en" | "both"


class EntityCreate(BaseModel):
    name: str
    name_ar: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    max_results: int = 10


class MentionCreate(BaseModel):
    entity_name: str
    source: str
    title: str
    url: str
    content: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    sentiment_ar: Optional[str] = None
    published_at: Optional[datetime] = None


class AlertCreate(BaseModel):
    entity_name: str
    message: str
    severity: str
    is_read: bool = False
