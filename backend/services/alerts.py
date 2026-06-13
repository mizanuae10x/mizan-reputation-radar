"""
Alert management service.

Creates database alerts based on sentiment analysis results.
Checks for critical/warning thresholds and sudden negative spikes.
"""
from __future__ import annotations

import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import create_alert, get_mentions_for_entity
from backend.models import Alert, SentimentResult

logger = logging.getLogger(__name__)


async def check_and_create_alerts(
    entity_name: str,
    sentiment: SentimentResult,
    db: AsyncSession,
) -> List[Alert]:
    """
    Evaluate the latest sentiment result and persist alerts when thresholds are breached.

    Alert rules:
      - score < -0.5  → critical
      - -0.5 <= score < -0.2  → warning
      - sudden drop (delta > 0.4 compared to previous avg) → warning
    """
    created_alerts: List[Alert] = []

    # ── Threshold-based alerts ──────────────────────────────────────────────
    if sentiment.score < -0.5:
        msg_en = (
            f"CRITICAL: Sentiment for '{entity_name}' is severely negative "
            f"(score: {sentiment.score:.2f}). Immediate attention required."
        )
        alert_model = await create_alert(
            db,
            entity_name=entity_name,
            message=msg_en,
            severity="critical",
        )
        created_alerts.append(
            Alert(
                id=alert_model.id,
                entity_name=alert_model.entity_name,
                message=alert_model.message,
                severity=alert_model.severity,
                is_read=alert_model.is_read,
                created_at=alert_model.created_at,
            )
        )
        logger.warning("Created CRITICAL alert for '%s' (score=%.2f)", entity_name, sentiment.score)

    elif sentiment.score < -0.2:
        msg_en = (
            f"WARNING: Sentiment for '{entity_name}' is trending negative "
            f"(score: {sentiment.score:.2f}). Review recent coverage."
        )
        alert_model = await create_alert(
            db,
            entity_name=entity_name,
            message=msg_en,
            severity="warning",
        )
        created_alerts.append(
            Alert(
                id=alert_model.id,
                entity_name=alert_model.entity_name,
                message=alert_model.message,
                severity=alert_model.severity,
                is_read=alert_model.is_read,
                created_at=alert_model.created_at,
            )
        )
        logger.info("Created WARNING alert for '%s' (score=%.2f)", entity_name, sentiment.score)

    # ── Spike detection: compare with previous mention average ──────────────
    try:
        recent_mentions = await get_mentions_for_entity(db, entity_name, limit=20)
        scored = [
            m.sentiment_score
            for m in recent_mentions
            if m.sentiment_score is not None
        ]
        if len(scored) >= 3:
            previous_avg = sum(scored[1:]) / len(scored[1:])  # exclude most recent
            delta = previous_avg - sentiment.score
            if delta > 0.4 and sentiment.score not in [a.entity_name for a in created_alerts]:
                msg_en = (
                    f"SPIKE DETECTED: Sudden negative shift for '{entity_name}'. "
                    f"Previous avg: {previous_avg:.2f}, Current: {sentiment.score:.2f} "
                    f"(drop of {delta:.2f})."
                )
                alert_model = await create_alert(
                    db,
                    entity_name=entity_name,
                    message=msg_en,
                    severity="warning",
                )
                created_alerts.append(
                    Alert(
                        id=alert_model.id,
                        entity_name=alert_model.entity_name,
                        message=alert_model.message,
                        severity=alert_model.severity,
                        is_read=alert_model.is_read,
                        created_at=alert_model.created_at,
                    )
                )
                logger.info(
                    "Created spike alert for '%s' (delta=%.2f)", entity_name, delta
                )
    except Exception as exc:
        logger.error("Spike detection failed: %s", exc)

    return created_alerts
