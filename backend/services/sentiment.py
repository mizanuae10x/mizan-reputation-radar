"""
Sentiment analysis service using Claude (Anthropic).

Falls back to a rule-based heuristic when ANTHROPIC_API_KEY is not set.
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List

from backend.models import SentimentResult

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Cached system prompt text (reused across calls for prompt-cache efficiency)
_SYSTEM_PROMPT = """You are an expert reputation and sentiment analysis AI specialising in
government and public-sector entities in the UAE and Arab World.

Your task is to analyse a set of news articles and web mentions about a specific entity and
return a structured JSON sentiment assessment.

Rules:
1. Be objective and evidence-based.
2. Score from -1.0 (extremely negative) to +1.0 (extremely positive). 0.0 is perfectly neutral.
3. The JSON you return MUST be valid and match the schema exactly.
4. Write the English summary in professional, concise prose (2-3 sentences).
5. Write the Arabic summary in formal Modern Standard Arabic (فصحى).
6. Key themes should be short noun phrases (3-6 words each), max 6 themes.

Return ONLY valid JSON with this exact structure:
{
  "score": <float between -1.0 and 1.0>,
  "label": "<positive|neutral|negative>",
  "label_ar": "<إيجابي|محايد|سلبي>",
  "summary": "<English summary>",
  "summary_ar": "<Arabic summary>",
  "key_themes": ["<theme1>", "<theme2>", ...]
}"""


def _heuristic_sentiment(mentions: List[Dict[str, Any]]) -> SentimentResult:
    """
    Simple keyword-based fallback when no API key is available.
    Scans title + content for positive/negative indicators.
    """
    positive_words = {
        "launch", "award", "praised", "recognized", "innovative", "success",
        "achievement", "partnership", "leading", "efficient", "improved",
        "satisfied", "excellent", "outstanding", "digital", "smart", "modern",
        "landmark", "accelerat", "pioneer", "honor", "celebrate",
    }
    negative_words = {
        "delay", "concern", "complaint", "failure", "criticism", "problem",
        "issue", "slow", "backlog", "dispute", "controversy", "scandal",
        "inefficient", "outdated", "frustrat", "dissatisfied", "crisis",
    }

    pos_count = 0
    neg_count = 0

    for m in mentions:
        text = ((m.get("title") or "") + " " + (m.get("content") or "")).lower()
        for w in positive_words:
            pos_count += text.count(w)
        for w in negative_words:
            neg_count += text.count(w)

    total = pos_count + neg_count or 1
    score = round((pos_count - neg_count) / total, 3)
    score = max(-1.0, min(1.0, score))

    if score >= 0.2:
        label, label_ar = "positive", "إيجابي"
        summary = "Coverage of this entity is predominantly positive, highlighting achievements in digital transformation and public service delivery."
        summary_ar = "تتسم التغطية الإعلامية لهذه الجهة بالإيجابية، مع التركيز على إنجازاتها في التحول الرقمي وتقديم الخدمات العامة."
    elif score <= -0.2:
        label, label_ar = "negative", "سلبي"
        summary = "Recent coverage raises concerns about service delivery and operational challenges that require attention."
        summary_ar = "تُثير التغطية الأخيرة مخاوف بشأن جودة الخدمات والتحديات التشغيلية التي تستدعي الاهتمام."
    else:
        label, label_ar = "neutral", "محايد"
        summary = "Coverage of this entity is balanced, with a mix of positive developments and areas identified for improvement."
        summary_ar = "تتسم التغطية بالتوازن، وتجمع بين الإنجازات الإيجابية ومجالات محددة تستوجب التحسين."

    key_themes = ["Digital Transformation", "Public Service Delivery", "Legal Innovation", "Citizen Satisfaction"]

    return SentimentResult(
        score=score,
        label=label,
        label_ar=label_ar,
        summary=summary,
        summary_ar=summary_ar,
        key_themes=key_themes,
    )


async def analyze_sentiment(
    entity_name: str,
    mentions: List[Dict[str, Any]],
) -> SentimentResult:
    """
    Analyse sentiment of collected mentions for an entity.

    Uses Claude claude-sonnet-4-6 with prompt caching when API key is available.
    Falls back to heuristic analysis otherwise.
    """
    if not ANTHROPIC_API_KEY:
        logger.warning(
            "ANTHROPIC_API_KEY not set — using heuristic sentiment for '%s'", entity_name
        )
        return _heuristic_sentiment(mentions)

    try:
        import anthropic  # type: ignore

        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

        # Build a concise mentions digest for the prompt
        mentions_text = ""
        for i, m in enumerate(mentions[:15], 1):  # cap at 15 to stay in context
            mentions_text += (
                f"\n[{i}] Title: {m.get('title', 'N/A')}\n"
                f"    Source: {m.get('source', 'N/A')}\n"
                f"    Content: {(m.get('content') or '')[:300]}\n"
            )

        user_message = (
            f"Analyse the reputation and sentiment for: **{entity_name}**\n\n"
            f"Here are {len(mentions)} recent mentions:\n{mentions_text}\n\n"
            "Return the JSON sentiment assessment now."
        )

        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=[
                {
                    "type": "text",
                    "text": _SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},  # prompt caching
                }
            ],
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = response.content[0].text.strip()

        # Extract JSON from potential markdown code blocks
        json_match = re.search(r"\{[\s\S]+\}", raw_text)
        if json_match:
            raw_text = json_match.group(0)

        data = json.loads(raw_text)

        return SentimentResult(
            score=float(data.get("score", 0.0)),
            label=data.get("label", "neutral"),
            label_ar=data.get("label_ar", "محايد"),
            summary=data.get("summary", ""),
            summary_ar=data.get("summary_ar", ""),
            key_themes=data.get("key_themes", []),
        )

    except Exception as exc:
        logger.error("Claude sentiment analysis failed: %s — using heuristic fallback", exc)
        return _heuristic_sentiment(mentions)
