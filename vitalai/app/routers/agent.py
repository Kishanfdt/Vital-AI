"""
agent.py — Proactive AI Health Agent (Phase H)

This agent reviews triage history, journal entries, and medications TOGETHER
across a 60-day window to surface genuine cross-source patterns and correlations.

Key design decisions:
  - Tool-calling is UNFORCED (tool_choice="auto") in the first pass — the model
    decides which data sources are relevant. Not all three tools are called every
    time; that's intentional and proves genuine reasoning, not data dumping.
  - A second forced call (tool_choice="required") extracts structured InsightList.
  - Results are cached in agent_insights for 24 hours. /refresh bypasses the cache.
  - System prompt instructs the model to say "no clear pattern" when data is sparse —
    credibility over synthetic insight.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth import get_current_user
from app.database import supabase
from app.services.llm import client, get_structured_output, run_agentic_tool_loop
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])

# ── How far back to look ──────────────────────────────────────
LOOKBACK_DAYS = 60

# ── System prompts ────────────────────────────────────────────
ANALYSIS_SYSTEM_PROMPT = """You are a proactive personal health analyst reviewing one user's health data across multiple sources.

Your sole job is to identify GENUINE patterns or correlations worth surfacing — not to invent connections.

Instructions:
1. Use the tools to pull the data you actually need. Do NOT call a tool if the data won't help.
2. Look for cross-source signals: e.g. sleep complaints in journal entries clustering around days with see_doctor_soon triage results; a medication added shortly before a symptom pattern begins; urgency frequency rising over baseline.
3. If the data is too sparse (< 3 entries across all sources combined), return a single insight with type "no_pattern" explaining why.
4. Frame insights as observations, not diagnoses. Use language like "a pattern worth noting", "you may want to mention this to your doctor", "this correlation may be coincidental".
5. Confidence ratings:
   - "high": same signal appears 3+ times independently across 2+ sources
   - "medium": appears 2+ times, single source, or plausible but not conclusive
   - "low": single occurrence, speculative, or based on limited data
6. Never fabricate: if the data doesn't support a clear pattern, say so explicitly. This is MORE credible than a forced insight.

Your analysis should feel like a thoughtful friend who happens to have your health data — warm, honest, and never alarming."""

STRUCTURED_SYSTEM_PROMPT = """Convert the health analysis text below into a structured list of insight objects.
Each insight must have: type (one of: pattern, trend, correlation, note, no_pattern), headline (≤12 words), detail (2-4 sentences), confidence (low/medium/high), sources (list of which data sources were used).
Preserve the original meaning exactly — do not add new insights or remove existing ones."""

INSIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "insights": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["pattern", "trend", "correlation", "note", "no_pattern"],
                        "description": "Category of the insight",
                    },
                    "headline": {
                        "type": "string",
                        "description": "Short headline, max 12 words",
                    },
                    "detail": {
                        "type": "string",
                        "description": "2-4 sentence explanation in plain, non-alarming language",
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                    },
                    "sources": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Data sources used: triage, journal, medications",
                    },
                },
                "required": ["type", "headline", "detail", "confidence", "sources"],
            },
        },
        "data_summary": {
            "type": "string",
            "description": "1-sentence summary of how much data was available (e.g. '12 journal entries, 4 triage checks, 3 medications over 60 days')",
        },
    },
    "required": ["insights", "data_summary"],
}

# ── Tool definitions (exposed to the model) ──────────────────
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_triage_patterns",
            "description": (
                "Retrieve and analyse the user's recent triage/symptom check history. "
                "Returns urgency distribution, frequency over time, and any notable spikes "
                "or changes in urgency level. Call this when triage frequency or symptom patterns are relevant."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_journal_sentiment_summary",
            "description": (
                "Retrieve and summarise the user's recent journal entries. "
                "Returns recurring themes, mentioned symptoms, mood signals, and any notable "
                "temporal clusters. Call this when journal content is relevant to the analysis."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_medication_timeline",
            "description": (
                "Retrieve the user's current medications and when each was added. "
                "Call this when medication timing may correlate with symptom patterns "
                "or when the medication list itself is relevant context."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


# ── Tool implementation functions (thin wrappers over pre-fetched data) ───────

def _build_triage_tool(triage_records: list[dict]):
    """Returns a closure that the agent calls as get_triage_patterns()."""
    def get_triage_patterns() -> dict:
        if not triage_records:
            return {"summary": "No triage records found in the last 60 days.", "records": []}

        # Urgency distribution
        dist: dict[str, int] = {}
        for r in triage_records:
            u = r.get("urgency", "unknown")
            dist[u] = dist.get(u, 0) + 1

        # Weekly buckets for trend
        weekly: dict[str, dict] = {}
        for r in triage_records:
            dt = r.get("created_at", "")[:10]
            try:
                d = datetime.fromisoformat(dt)
                week = f"Week of {(d - timedelta(days=d.weekday())).strftime('%b %d')}"
            except Exception:
                week = "Unknown"
            weekly.setdefault(week, {})
            u = r.get("urgency", "unknown")
            weekly[week][u] = weekly[week].get(u, 0) + 1

        # Recent entries summary (last 5)
        recent = [
            {
                "date": r.get("created_at", "")[:10],
                "urgency": r.get("urgency", ""),
                "symptoms_snippet": (r.get("symptoms") or "")[:150],
            }
            for r in triage_records[:5]
        ]

        return {
            "total_checks": len(triage_records),
            "urgency_distribution": dist,
            "weekly_breakdown": weekly,
            "recent_checks": recent,
            "summary": (
                f"{len(triage_records)} triage checks over 60 days. "
                f"Urgency breakdown: {', '.join(f'{v}× {k}' for k, v in dist.items())}."
            ),
        }
    return get_triage_patterns


def _build_journal_tool(journal_records: list[dict]):
    """Returns a closure that the agent calls as get_journal_sentiment_summary()."""
    def get_journal_sentiment_summary() -> dict:
        if not journal_records:
            return {"summary": "No journal entries found in the last 60 days.", "entries": []}

        entries = [
            {
                "date": r.get("created_at", "")[:10],
                "content": (r.get("content") or "")[:300],
            }
            for r in journal_records[:15]  # last 15 — enough for pattern detection
        ]

        # Build a concise text block for the summary field
        joined = "\n".join(f"[{e['date']}] {e['content']}" for e in entries)
        return {
            "total_entries": len(journal_records),
            "entries_sample": entries,
            "full_text_for_analysis": joined,
            "summary": f"{len(journal_records)} journal entries found over 60 days.",
        }
    return get_journal_sentiment_summary


def _build_medication_tool(medication_records: list[dict]):
    """Returns a closure that the agent calls as get_medication_timeline()."""
    def get_medication_timeline() -> dict:
        if not medication_records:
            return {"summary": "No medications currently tracked.", "medications": []}

        meds = [
            {
                "name": r.get("name", ""),
                "dosage": r.get("dosage") or "not specified",
                "added": r.get("created_at", "")[:10],
            }
            for r in medication_records
        ]
        return {
            "total_medications": len(meds),
            "medications": meds,
            "summary": (
                f"{len(meds)} medication(s) tracked: "
                + ", ".join(f"{m['name']} (since {m['added']})" for m in meds)
                + "."
            ),
        }
    return get_medication_timeline


# ── Data fetcher ──────────────────────────────────────────────

def _fetch_user_data(user_id: str) -> tuple[list, list, list]:
    """Fetch all three data sources in one go."""
    since = (datetime.utcnow() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    triage = (
        supabase.table("triage_history")
        .select("urgency, symptoms, created_at")
        .eq("user_id", user_id)
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    ).data or []

    journal = (
        supabase.table("journal_entries")
        .select("content, created_at")
        .eq("user_id", user_id)
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(40)
        .execute()
    ).data or []

    medications = (
        supabase.table("medications")
        .select("name, dosage, created_at")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    return triage, journal, medications


# ── Cache helpers ─────────────────────────────────────────────
CACHE_TTL_SECONDS = 86_400  # 24 hours


def _get_cached(user_id: str) -> dict | None:
    try:
        result = (
            supabase.table("agent_insights")
            .select("insights_json, generated_at")
            .eq("user_id", user_id)
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        row = result.data[0]
        generated = datetime.fromisoformat(row["generated_at"].replace("Z", "+00:00"))
        if generated.tzinfo is None:
            generated = generated.replace(tzinfo=timezone.utc)
        age = (datetime.now(tz=timezone.utc) - generated).total_seconds()
        if age < CACHE_TTL_SECONDS:
            payload = row["insights_json"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            return {**payload, "cached": True, "generated_at": row["generated_at"]}
    except Exception as e:
        logger.warning("Cache read failed: %s", e)
    return None


def _write_cache(user_id: str, payload: dict) -> None:
    try:
        # Upsert by deleting old rows first (no unique constraint needed)
        supabase.table("agent_insights").delete().eq("user_id", user_id).execute()
        supabase.table("agent_insights").insert({
            "user_id": user_id,
            "insights_json": json.dumps(payload),
        }).execute()
    except Exception as e:
        logger.warning("Cache write failed: %s", e)


# ── Core generation function ──────────────────────────────────

def _generate_insights(user_id: str) -> dict:
    """Run the full multi-tool agent loop and return structured insights."""

    # 1. Fetch raw data
    triage, journal, medications = _fetch_user_data(user_id)

    total_records = len(triage) + len(journal) + len(medications)

    # 2. Build tool closures over the fetched data
    available_functions: dict[str, Any] = {
        "get_triage_patterns":         _build_triage_tool(triage),
        "get_journal_sentiment_summary": _build_journal_tool(journal),
        "get_medication_timeline":     _build_medication_tool(medications),
    }

    # 3. Tell the model what data is available
    user_prompt = (
        f"The user has {len(triage)} triage checks, {len(journal)} journal entries, "
        f"and {len(medications)} tracked medication(s) over the last {LOOKBACK_DAYS} days. "
        "Use the available tools to pull the data you need, then produce a health pattern analysis. "
        "Only call tools whose data is relevant to finding a genuine pattern."
    )

    # 4. Unforced tool loop (model picks which tools to call)
    raw_analysis, tools_called = run_agentic_tool_loop(
        system_prompt=ANALYSIS_SYSTEM_PROMPT,
        user_message=user_prompt,
        tools=AGENT_TOOLS,
        available_functions=available_functions,
        max_tokens=1200,
    )

    # 5. Force structured output from the raw analysis text
    structured = get_structured_output(
        system_prompt=STRUCTURED_SYSTEM_PROMPT,
        user_message=raw_analysis or (
            "No clear patterns could be identified from the available data. "
            f"Data available: {len(triage)} triage, {len(journal)} journal, {len(medications)} medications."
        ),
        tool_name="submit_health_insights",
        tool_description="Submit the structured list of health insights",
        input_schema=INSIGHT_SCHEMA,
        max_tokens=1200,
    )

    return {
        **structured,
        "tools_called": list(tools_called.keys()),
        "total_records_analysed": total_records,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "cached": False,
    }


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/insights")
def get_agent_insights(user_id: str = Depends(get_current_user)):
    """
    Return proactive cross-source health insights.
    Returns cached result if < 24 h old.
    The model autonomously decides which tool(s) to call based on data relevance.
    """
    cached = _get_cached(user_id)
    if cached:
        return cached

    try:
        result = _generate_insights(user_id)
        _write_cache(user_id, result)
        return result
    except Exception as e:
        logger.error("Agent insight generation failed: %s", e)
        # Graceful fallback — return empty rather than 500
        return JSONResponse(
            status_code=200,
            content={
                "insights": [{
                    "type": "note",
                    "headline": "Analysis temporarily unavailable",
                    "detail": "The pattern analysis couldn't complete right now. Try refreshing in a moment.",
                    "confidence": "low",
                    "sources": [],
                }],
                "data_summary": "Analysis could not be completed.",
                "tools_called": [],
                "total_records_analysed": 0,
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "cached": False,
            }
        )


@router.post("/insights/refresh")
def refresh_agent_insights(user_id: str = Depends(get_current_user)):
    """
    Force-regenerate insights, bypassing the 24-hour cache.
    Use sparingly — this triggers a multi-tool LLM pipeline.
    """
    try:
        result = _generate_insights(user_id)
        _write_cache(user_id, result)
        return result
    except Exception as e:
        logger.error("Agent refresh failed: %s", e)
        return JSONResponse(
            status_code=503,
            content={"detail": "Analysis generation failed. Please try again."},
        )
