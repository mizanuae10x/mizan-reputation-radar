"""
PDF Report generation service using ReportLab.

Produces bilingual (Arabic + English) reputation reports with Mizan branding.
Arabic text reshaping via arabic_reshaper + bidi if available; plain unicode fallback otherwise.
"""
from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from backend.models import SentimentResult

logger = logging.getLogger(__name__)

# Brand colours (RGB 0-1)
GOLD = (0.831, 0.686, 0.216)         # #D4AF37
DARK = (0.106, 0.114, 0.129)         # #1B1D21
BEIGE = (0.949, 0.925, 0.812)        # #f2eccf
WHITE = (1, 1, 1)
LIGHT_GRAY = (0.9, 0.9, 0.9)
DARK_CARD = (0.133, 0.145, 0.165)    # #22252a


def _prepare_arabic(text: str) -> str:
    """Apply arabic reshaping + bidi algorithm if libraries are available."""
    try:
        import arabic_reshaper  # type: ignore
        from bidi.algorithm import get_display  # type: ignore
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except ImportError:
        return text


def _sentiment_color(score: float):
    """Return an (R,G,B) colour tuple for the given sentiment score."""
    if score >= 0.2:
        return (0.2, 0.7, 0.3)   # green
    elif score <= -0.2:
        return (0.85, 0.2, 0.2)  # red
    else:
        return (0.9, 0.7, 0.1)   # amber


def generate_pdf_report(
    entity_name: str,
    mentions: List[Dict[str, Any]],
    sentiment: SentimentResult,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    language: str = "both",
) -> bytes:
    """
    Generate a PDF reputation report and return raw bytes.

    Parameters
    ----------
    entity_name : str
        The entity being reported on.
    mentions : list[dict]
        Raw mention dicts (title, source, content, url, published_at, sentiment_score).
    sentiment : SentimentResult
        Aggregated sentiment analysis result.
    date_from / date_to : str, optional
        ISO date strings for the report date range.
    language : "ar" | "en" | "both"
        Language(s) for the report.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm, mm
        from reportlab.platypus import (
            HRFlowable,
            Image,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    except ImportError as exc:
        raise RuntimeError(f"ReportLab is required for PDF generation: {exc}")

    buffer = io.BytesIO()
    page_width, page_height = A4

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        title=f"Reputation Report – {entity_name}",
        author="Mizan Reputation Radar",
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "MizanTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=24,
        textColor=colors.HexColor("#D4AF37"),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "MizanSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        textColor=colors.HexColor("#888888"),
        spaceAfter=4,
        alignment=TA_CENTER,
    )
    section_style = ParagraphStyle(
        "MizanSection",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=colors.HexColor("#D4AF37"),
        spaceBefore=14,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "MizanBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#222222"),
        spaceAfter=4,
        leading=14,
    )
    arabic_style = ParagraphStyle(
        "MizanArabic",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        textColor=colors.HexColor("#222222"),
        spaceAfter=4,
        alignment=TA_RIGHT,
        leading=16,
    )
    small_style = ParagraphStyle(
        "MizanSmall",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#555555"),
        spaceAfter=2,
    )

    def gold_rule():
        return HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#D4AF37"), spaceAfter=8)

    story = []

    # ── Cover / Header ──────────────────────────────────────────────────────
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("رادار السمعة | Mizan Reputation Radar", title_style))
    story.append(Paragraph("وزارة العدل الإماراتية | UAE Ministry of Justice", subtitle_style))
    story.append(gold_rule())
    story.append(Spacer(1, 0.3 * cm))

    # Entity name
    story.append(
        Paragraph(
            f"<b>Reputation Report:</b> {entity_name}",
            ParagraphStyle("EntityTitle", parent=section_style, fontSize=15, textColor=colors.HexColor("#1B1D21")),
        )
    )

    # Date range
    dr_from = date_from or "—"
    dr_to = date_to or datetime.utcnow().strftime("%Y-%m-%d")
    story.append(Paragraph(f"Period: {dr_from} → {dr_to}", subtitle_style))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", small_style))
    story.append(Spacer(1, 0.4 * cm))

    # ── Sentiment Overview ──────────────────────────────────────────────────
    story.append(Paragraph("Sentiment Overview", section_style))
    story.append(gold_rule())

    score_color = colors.HexColor(
        "#22C55E" if sentiment.score >= 0.2
        else "#EF4444" if sentiment.score <= -0.2
        else "#F59E0B"
    )
    label_display = sentiment.label.upper()
    score_pct = int((sentiment.score + 1) / 2 * 100)

    sentiment_data = [
        ["Score", "Label", "Arabic Label", "Score %"],
        [
            f"{sentiment.score:+.3f}",
            label_display,
            _prepare_arabic(sentiment.label_ar),
            f"{score_pct}%",
        ],
    ]
    sentiment_table = Table(sentiment_data, colWidths=[4 * cm, 4 * cm, 4 * cm, 4 * cm])
    sentiment_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B1D21")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#D4AF37")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F9F6EE")),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 1), (-1, 1), 12),
                ("TEXTCOLOR", (0, 1), (0, 1), score_color),
                ("TEXTCOLOR", (1, 1), (1, 1), score_color),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F9F6EE")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D4AF37")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(sentiment_table)
    story.append(Spacer(1, 0.3 * cm))

    # Summary text
    if language in ("en", "both"):
        story.append(Paragraph("<b>Summary (English):</b>", body_style))
        story.append(Paragraph(sentiment.summary, body_style))

    if language in ("ar", "both"):
        story.append(Paragraph("<b>ملخص (عربي):</b>", body_style))
        story.append(Paragraph(_prepare_arabic(sentiment.summary_ar), arabic_style))

    story.append(Spacer(1, 0.3 * cm))

    # Key themes
    if sentiment.key_themes:
        story.append(Paragraph("<b>Key Themes:</b>", body_style))
        themes_str = "  •  ".join(sentiment.key_themes)
        story.append(
            Paragraph(
                themes_str,
                ParagraphStyle("Themes", parent=body_style, textColor=colors.HexColor("#D4AF37"), fontName="Helvetica-Bold"),
            )
        )

    story.append(Spacer(1, 0.5 * cm))

    # ── Mentions Table ──────────────────────────────────────────────────────
    story.append(Paragraph(f"Recent Mentions ({len(mentions)} total)", section_style))
    story.append(gold_rule())

    display_mentions = mentions[:20]
    if display_mentions:
        table_data = [["#", "Title", "Source", "Sentiment", "Date"]]
        for i, m in enumerate(display_mentions, 1):
            title = (m.get("title") or "")[:55] + ("…" if len(m.get("title") or "") > 55 else "")
            source = (m.get("source") or "")[:20]
            score_val = m.get("sentiment_score")
            if score_val is None:
                sent_str = "—"
            else:
                sent_str = f"{score_val:+.2f}"
            pub = m.get("published_at")
            if isinstance(pub, datetime):
                date_str = pub.strftime("%Y-%m-%d")
            else:
                date_str = str(pub or "")[:10]

            table_data.append([str(i), title, source, sent_str, date_str])

        col_widths = [1 * cm, 8.5 * cm, 3.5 * cm, 2 * cm, 2.5 * cm]
        mentions_table = Table(table_data, colWidths=col_widths)
        mentions_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B1D21")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#D4AF37")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9F6EE")]),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("ALIGN", (3, 0), (3, -1), "CENTER"),
                    ("ALIGN", (4, 0), (4, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#DDDDDD")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(mentions_table)
    else:
        story.append(Paragraph("No mentions found for the selected period.", body_style))

    story.append(Spacer(1, 0.5 * cm))

    # ── Footer ──────────────────────────────────────────────────────────────
    story.append(gold_rule())
    story.append(
        Paragraph(
            "Confidential | رادار السمعة – ميزان | Powered by Claude AI & Tavily Search",
            ParagraphStyle("Footer", parent=small_style, alignment=TA_CENTER, textColor=colors.HexColor("#888888")),
        )
    )

    doc.build(story)
    return buffer.getvalue()
