"""
Mizan Reputation Radar – FastAPI Backend
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import (
    AsyncSessionLocal,
    create_entity,
    create_mention,
    get_all_alerts,
    get_all_entities,
    get_entity_by_name,
    get_mentions_for_entity,
    init_db,
    mark_alert_read,
)
from backend.models import (
    Alert,
    Entity,
    EntityCreate,
    Mention,
    ReportRequest,
    SearchRequest,
    SentimentResult,
)
from backend.services.alerts import check_and_create_alerts
from backend.services.monitor import search_mentions
from backend.services.reports import generate_pdf_report
from backend.services.sentiment import analyze_sentiment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB and start background scheduler on startup."""
    await init_db()
    logger.info("Database initialised.")

    # Start APScheduler for periodic refresh
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore

        scheduler = AsyncIOScheduler()
        scheduler.add_job(
            _refresh_all_entities,
            "interval",
            minutes=30,
            id="auto_refresh",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started – auto-refresh every 30 minutes.")
        app.state.scheduler = scheduler
    except Exception as exc:
        logger.warning("APScheduler not available: %s", exc)

    yield

    # Shutdown
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down.")


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Mizan Reputation Radar API",
    description="Real-time reputation monitoring for the UAE Ministry of Justice",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Background helpers
# ---------------------------------------------------------------------------


async def _refresh_entity(entity_name: str) -> None:
    """Fetch new mentions and run sentiment analysis for one entity."""
    try:
        async with AsyncSessionLocal() as db:
            raw_mentions = await search_mentions(entity_name, max_results=10)
            sentiment = await analyze_sentiment(entity_name, raw_mentions)

            for m in raw_mentions:
                await create_mention(
                    db,
                    entity_name=entity_name,
                    source=m.get("source", ""),
                    title=m.get("title", ""),
                    url=m.get("url", ""),
                    content=m.get("content"),
                    sentiment_score=sentiment.score,
                    sentiment_label=sentiment.label,
                    sentiment_ar=sentiment.label_ar,
                    published_at=m.get("published_at"),
                )

            await check_and_create_alerts(entity_name, sentiment, db)
            logger.info("Refreshed '%s' – score=%.3f", entity_name, sentiment.score)
    except Exception as exc:
        logger.error("Refresh failed for '%s': %s", entity_name, exc)


async def _refresh_all_entities() -> None:
    """Scheduled job: refresh all active entities."""
    async with AsyncSessionLocal() as db:
        entities = await get_all_entities(db)
    for entity in entities:
        await _refresh_entity(entity.name)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "Mizan Reputation Radar",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }


# ── Entity management ───────────────────────────────────────────────────────


@app.get("/api/v1/entities", response_model=List[Entity])
async def list_entities(db: AsyncSession = Depends(get_db)) -> List[Entity]:
    """Return all monitored entities."""
    rows = await get_all_entities(db)
    return [
        Entity(
            id=r.id,
            name=r.name,
            name_ar=r.name_ar,
            created_at=r.created_at,
            is_active=r.is_active,
        )
        for r in rows
    ]


@app.post("/api/v1/entities", response_model=Entity, status_code=201)
async def add_entity(
    payload: EntityCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Entity:
    """Add a new entity to monitor and trigger an immediate refresh."""
    existing = await get_entity_by_name(db, payload.name)
    if existing:
        raise HTTPException(status_code=409, detail=f"Entity '{payload.name}' already exists.")

    row = await create_entity(db, name=payload.name, name_ar=payload.name_ar)
    background_tasks.add_task(_refresh_entity, payload.name)
    return Entity(
        id=row.id,
        name=row.name,
        name_ar=row.name_ar,
        created_at=row.created_at,
        is_active=row.is_active,
    )


# ── Search ──────────────────────────────────────────────────────────────────


@app.post("/api/v1/search")
async def search_entity(
    payload: SearchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Search for mentions of an entity, store in DB, and return results.
    Also upserts the entity in the monitored list.
    """
    entity_name = payload.query.strip()
    if not entity_name:
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    # Ensure entity exists
    existing = await get_entity_by_name(db, entity_name)
    if not existing:
        await create_entity(db, name=entity_name)

    raw_mentions = await search_mentions(entity_name, max_results=payload.max_results)
    sentiment = await analyze_sentiment(entity_name, raw_mentions)

    saved: List[Dict[str, Any]] = []
    for m in raw_mentions:
        row = await create_mention(
            db,
            entity_name=entity_name,
            source=m.get("source", ""),
            title=m.get("title", ""),
            url=m.get("url", ""),
            content=m.get("content"),
            sentiment_score=sentiment.score,
            sentiment_label=sentiment.label,
            sentiment_ar=sentiment.label_ar,
            published_at=m.get("published_at"),
        )
        saved.append(
            {
                "id": row.id,
                "title": row.title,
                "source": row.source,
                "url": row.url,
                "content": row.content,
                "sentiment_score": row.sentiment_score,
                "sentiment_label": row.sentiment_label,
                "sentiment_ar": row.sentiment_ar,
                "published_at": row.published_at.isoformat() if row.published_at else None,
                "created_at": row.created_at.isoformat(),
            }
        )

    await check_and_create_alerts(entity_name, sentiment, db)

    return {
        "entity_name": entity_name,
        "mentions": saved,
        "sentiment": sentiment.dict(),
        "total": len(saved),
    }


# ── Mentions ────────────────────────────────────────────────────────────────


@app.get("/api/v1/mentions/{entity_name}", response_model=List[Mention])
async def get_mentions(
    entity_name: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> List[Mention]:
    rows = await get_mentions_for_entity(db, entity_name, limit=limit)
    return [
        Mention(
            id=r.id,
            entity_name=r.entity_name,
            source=r.source,
            title=r.title,
            url=r.url,
            content=r.content,
            sentiment_score=r.sentiment_score,
            sentiment_label=r.sentiment_label,
            sentiment_ar=r.sentiment_ar,
            published_at=r.published_at,
            created_at=r.created_at,
        )
        for r in rows
    ]


# ── Sentiment ───────────────────────────────────────────────────────────────


@app.get("/api/v1/sentiment/{entity_name}", response_model=SentimentResult)
async def get_sentiment(
    entity_name: str,
    db: AsyncSession = Depends(get_db),
) -> SentimentResult:
    """Return on-demand sentiment for the entity's stored mentions."""
    rows = await get_mentions_for_entity(db, entity_name, limit=20)
    if not rows:
        # Trigger a fresh search
        raw_mentions = await search_mentions(entity_name, max_results=8)
        sentiment = await analyze_sentiment(entity_name, raw_mentions)
        for m in raw_mentions:
            await create_mention(
                db,
                entity_name=entity_name,
                source=m.get("source", ""),
                title=m.get("title", ""),
                url=m.get("url", ""),
                content=m.get("content"),
                sentiment_score=sentiment.score,
                sentiment_label=sentiment.label,
                sentiment_ar=sentiment.label_ar,
                published_at=m.get("published_at"),
            )
        return sentiment

    mention_dicts = [
        {
            "title": r.title,
            "source": r.source,
            "content": r.content,
            "sentiment_score": r.sentiment_score,
        }
        for r in rows
    ]
    return await analyze_sentiment(entity_name, mention_dicts)


# ── Reports ─────────────────────────────────────────────────────────────────


@app.post("/api/v1/report/{entity_name}")
async def generate_report(
    entity_name: str,
    payload: ReportRequest,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate and download a PDF reputation report."""
    rows = await get_mentions_for_entity(db, entity_name, limit=50)
    if not rows:
        raise HTTPException(status_code=404, detail=f"No mentions found for '{entity_name}'.")

    mention_dicts = [
        {
            "title": r.title,
            "source": r.source,
            "content": r.content,
            "url": r.url,
            "sentiment_score": r.sentiment_score,
            "published_at": r.published_at,
        }
        for r in rows
    ]

    sentiment = await analyze_sentiment(entity_name, mention_dicts)

    try:
        pdf_bytes = generate_pdf_report(
            entity_name=entity_name,
            mentions=mention_dicts,
            sentiment=sentiment,
            date_from=payload.date_from,
            date_to=payload.date_to,
            language=payload.language,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    safe_name = entity_name.replace(" ", "_").replace("/", "_")
    filename = f"mizan_report_{safe_name}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Alerts ──────────────────────────────────────────────────────────────────


@app.get("/api/v1/alerts", response_model=List[Alert])
async def list_alerts(
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> List[Alert]:
    rows = await get_all_alerts(db, unread_only=unread_only)
    return [
        Alert(
            id=r.id,
            entity_name=r.entity_name,
            message=r.message,
            severity=r.severity,
            is_read=r.is_read,
            created_at=r.created_at,
        )
        for r in rows
    ]


@app.patch("/api/v1/alerts/{alert_id}/read")
async def mark_alert_as_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    await mark_alert_read(db, alert_id)
    return {"status": "ok", "alert_id": alert_id}
