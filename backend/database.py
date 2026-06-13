from __future__ import annotations

import os
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./radar.db")


class Base(DeclarativeBase):
    pass


class EntityModel(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    name_ar = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class MentionModel(Base):
    __tablename__ = "mentions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    entity_name = Column(String(255), nullable=False, index=True)
    source = Column(String(255), nullable=False)
    title = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    content = Column(Text, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    sentiment_label = Column(String(50), nullable=True)
    sentiment_ar = Column(String(50), nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    entity_name = Column(String(255), nullable=False, index=True)
    message = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# Async engine
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    """Create all tables and seed the default MOJ entity."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed the Ministry of Justice entity for the demo
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(EntityModel).where(EntityModel.name == "Ministry of Justice UAE")
        )
        existing = result.scalar_one_or_none()
        if not existing:
            moj = EntityModel(
                name="Ministry of Justice UAE",
                name_ar="وزارة العدل الإماراتية",
                created_at=datetime.utcnow(),
                is_active=True,
            )
            session.add(moj)
            await session.commit()


async def get_db():
    """Dependency injector for FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------


async def create_entity(session: AsyncSession, name: str, name_ar: Optional[str] = None) -> EntityModel:
    entity = EntityModel(name=name, name_ar=name_ar, created_at=datetime.utcnow())
    session.add(entity)
    await session.commit()
    await session.refresh(entity)
    return entity


async def get_all_entities(session: AsyncSession) -> List[EntityModel]:
    result = await session.execute(select(EntityModel).where(EntityModel.is_active == True))
    return list(result.scalars().all())


async def get_entity_by_name(session: AsyncSession, name: str) -> Optional[EntityModel]:
    result = await session.execute(select(EntityModel).where(EntityModel.name == name))
    return result.scalar_one_or_none()


async def create_mention(
    session: AsyncSession,
    entity_name: str,
    source: str,
    title: str,
    url: str,
    content: Optional[str] = None,
    sentiment_score: Optional[float] = None,
    sentiment_label: Optional[str] = None,
    sentiment_ar: Optional[str] = None,
    published_at: Optional[datetime] = None,
) -> MentionModel:
    mention = MentionModel(
        entity_name=entity_name,
        source=source,
        title=title,
        url=url,
        content=content,
        sentiment_score=sentiment_score,
        sentiment_label=sentiment_label,
        sentiment_ar=sentiment_ar,
        published_at=published_at,
        created_at=datetime.utcnow(),
    )
    session.add(mention)
    await session.commit()
    await session.refresh(mention)
    return mention


async def get_mentions_for_entity(
    session: AsyncSession,
    entity_name: str,
    limit: int = 50,
) -> List[MentionModel]:
    result = await session.execute(
        select(MentionModel)
        .where(MentionModel.entity_name == entity_name)
        .order_by(MentionModel.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_alert(
    session: AsyncSession,
    entity_name: str,
    message: str,
    severity: str,
) -> AlertModel:
    alert = AlertModel(
        entity_name=entity_name,
        message=message,
        severity=severity,
        created_at=datetime.utcnow(),
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return alert


async def get_all_alerts(session: AsyncSession, unread_only: bool = False) -> List[AlertModel]:
    stmt = select(AlertModel).order_by(AlertModel.created_at.desc())
    if unread_only:
        stmt = stmt.where(AlertModel.is_read == False)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def mark_alert_read(session: AsyncSession, alert_id: int) -> None:
    await session.execute(
        update(AlertModel).where(AlertModel.id == alert_id).values(is_read=True)
    )
    await session.commit()
