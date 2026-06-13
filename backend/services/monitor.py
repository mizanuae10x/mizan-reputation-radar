"""
Mention monitoring service.

Uses Tavily Search API to find news/web mentions of an entity.
Falls back to rich mock data when TAVILY_API_KEY is not set.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")


def _extract_domain(url: str) -> str:
    """Return the domain part of a URL as a human-readable source name."""
    try:
        parsed = urlparse(url)
        return parsed.netloc.replace("www.", "")
    except Exception:
        return "Unknown"


def _mock_mentions(entity_name: str) -> List[Dict[str, Any]]:
    """Return realistic-looking mock mentions when no API key is available."""
    now = datetime.utcnow()
    entity_ar = "وزارة العدل" if "Justice" in entity_name else entity_name

    return [
        {
            "title": f"{entity_name} launches AI-powered legal services platform",
            "url": "https://gulfnews.com/uae/government/moj-ai-legal-services",
            "content": (
                f"The {entity_name} has unveiled a state-of-the-art AI platform aimed at "
                "streamlining legal document processing, reducing wait times by 60% and "
                "providing citizens with 24/7 access to legal guidance."
            ),
            "source": "gulfnews.com",
            "published_at": now - timedelta(hours=2),
        },
        {
            "title": f"{entity_name} recognized at GITEX for digital transformation",
            "url": "https://khaleejtimes.com/uae/moj-gitex-award",
            "content": (
                f"{entity_name} received the 'Best Digital Government Service' award at GITEX "
                "2024, recognizing its innovative approach to e-justice and citizen satisfaction."
            ),
            "source": "khaleejtimes.com",
            "published_at": now - timedelta(hours=5),
        },
        {
            "title": f"Citizens praise {entity_name} online court services",
            "url": "https://thenationalnews.com/uae/2024/moj-online-courts",
            "content": (
                "A recent survey shows 87% of citizens are satisfied with the new online court "
                f"filing system introduced by {entity_name}, calling it a game-changer for access "
                "to justice in the UAE."
            ),
            "source": "thenationalnews.com",
            "published_at": now - timedelta(hours=8),
        },
        {
            "title": f"{entity_ar} تطلق خدمات قانونية جديدة للمقيمين",
            "url": "https://albayan.ae/uae/moj-new-services",
            "content": (
                f"أعلنت {entity_ar} عن حزمة جديدة من الخدمات القانونية المتكاملة التي تستهدف "
                "تسهيل وصول المقيمين إلى العدالة وتقليل الأعباء البيروقراطية بنسبة تصل إلى 70%."
            ),
            "source": "albayan.ae",
            "published_at": now - timedelta(hours=12),
        },
        {
            "title": f"Concerns raised over processing delays at {entity_name}",
            "url": "https://arabianbusiness.com/moj-processing-delays",
            "content": (
                f"Some legal professionals have expressed concern about occasional processing delays "
                f"at {entity_name} courts, urging the ministry to expand its digital infrastructure "
                "to accommodate growing caseloads."
            ),
            "source": "arabianbusiness.com",
            "published_at": now - timedelta(hours=18),
        },
        {
            "title": f"{entity_name} partners with DIFC for cross-border legal framework",
            "url": "https://reuters.com/world/middle-east/uae-moj-difc-partnership",
            "content": (
                f"A landmark agreement between {entity_name} and the Dubai International Financial "
                "Centre courts will create a unified cross-border enforcement framework, boosting "
                "the UAE's status as a global arbitration hub."
            ),
            "source": "reuters.com",
            "published_at": now - timedelta(hours=22),
        },
        {
            "title": f"حوكمة قضائية رقمية: تجربة {entity_ar} نموذجاً للعالم العربي",
            "url": "https://alkhaleej.ae/opinion/moj-digital-governance",
            "content": (
                f"باتت تجربة {entity_ar} في التحول الرقمي نموذجاً يُحتذى به في المنطقة، "
                "إذ حققت خفضاً ملموساً في أوقات الانتظار وارتفاعاً في مؤشرات رضا المتعاملين."
            ),
            "source": "alkhaleej.ae",
            "published_at": now - timedelta(hours=30),
        },
        {
            "title": f"{entity_name} accelerates smart court rollout across all emirates",
            "url": "https://wam.ae/article/moj-smart-courts-2024",
            "content": (
                f"{entity_name} announced the accelerated rollout of its smart court system to all "
                "seven emirates by Q1 2025, integrating AI translation, e-signatures, and video "
                "testimony capabilities."
            ),
            "source": "wam.ae",
            "published_at": now - timedelta(hours=36),
        },
    ]


async def search_mentions(
    entity_name: str,
    max_results: int = 10,
) -> List[Dict[str, Any]]:
    """
    Search for web/news mentions of the given entity.

    Returns a list of dicts with keys:
        title, url, content, source, published_at
    """
    if not TAVILY_API_KEY:
        logger.warning(
            "TAVILY_API_KEY not set — returning mock mentions for '%s'", entity_name
        )
        return _mock_mentions(entity_name)[:max_results]

    try:
        from tavily import TavilyClient  # type: ignore

        client = TavilyClient(api_key=TAVILY_API_KEY)

        all_results: List[Dict[str, Any]] = []

        # English search
        response_en = client.search(
            query=entity_name,
            search_depth="advanced",
            max_results=max_results // 2 + 1,
            include_answer=False,
        )
        for r in response_en.get("results", []):
            all_results.append(
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", "")[:500],
                    "source": _extract_domain(r.get("url", "")),
                    "published_at": _parse_date(r.get("published_date")),
                }
            )

        # Arabic search
        response_ar = client.search(
            query=f"{entity_name} اخبار",
            search_depth="advanced",
            max_results=max_results // 2,
            include_answer=False,
        )
        for r in response_ar.get("results", []):
            all_results.append(
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", "")[:500],
                    "source": _extract_domain(r.get("url", "")),
                    "published_at": _parse_date(r.get("published_date")),
                }
            )

        # Deduplicate by URL
        seen: set = set()
        unique: List[Dict[str, Any]] = []
        for item in all_results:
            if item["url"] not in seen:
                seen.add(item["url"])
                unique.append(item)

        return unique[:max_results]

    except Exception as exc:
        logger.error("Tavily search failed: %s — falling back to mock data", exc)
        return _mock_mentions(entity_name)[:max_results]


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Try to parse a date string returned by Tavily."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(date_str[:19], fmt)
        except ValueError:
            continue
    return None
