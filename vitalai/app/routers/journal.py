from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
import numpy as np
from app.models import JournalEntryCreate, JournalTrendResponse
from app.auth import get_current_user
from app.database import supabase
from app.config import settings
from app.services.llm import client
from app.routers.documents import get_voyage_embeddings

router = APIRouter(prefix="/journal", tags=["journal"])

SYSTEM_TREND_PROMPT = """You are a health and wellness analysis assistant. Your role is to analyze a patient's health journal entries over time to identify emotional patterns, physical symptom trends, stress indicators, and general wellness progress.

Be empathetic, insightful, and constructive. Summarize key patterns concisely in structured plain language."""


@router.post("")
def create_entry(entry: JournalEntryCreate, user_id: str = Depends(get_current_user)):
    if not entry.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Journal entry content cannot be empty.")

    # Generate vector embedding for journal entry if Voyage API key is present
    embedding = None
    if settings.voyage_api_key:
        try:
            embeddings = get_voyage_embeddings([entry.content.strip()], input_type="document")
            embedding = embeddings[0]
        except Exception:
            embedding = None

    data_to_insert = {
        "user_id": user_id,
        "content": entry.content.strip(),
    }
    if embedding is not None:
        data_to_insert["embedding"] = embedding

    result = supabase.table("journal_entries").insert(data_to_insert).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save journal entry.")
    return result.data[0]


@router.get("")
def list_entries(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("journal_entries")
        .select("id, user_id, content, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/trends", response_model=JournalTrendResponse)
def get_journal_trends(user_id: str = Depends(get_current_user)):
    # 1. Fetch entries from past 30 days
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    records = (
        supabase.table("journal_entries")
        .select("id, content, embedding, created_at")
        .eq("user_id", user_id)
        .gte("created_at", thirty_days_ago)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    # Fallback to recent 30 entries if no entries in last 30 days
    if not records:
        records = (
            supabase.table("journal_entries")
            .select("id, content, embedding, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(30)
            .execute()
        ).data or []

    if not records:
        return JournalTrendResponse(
            total_entries=0,
            trend_summary="No journal entries logged yet. Start recording your daily health and mood logs to see AI-driven trend analysis.",
            detected_clusters=[],
        )

    # 2. Extract contents and embeddings
    contents = [r["content"] for r in records]
    valid_embeddings = [r["embedding"] for r in records if r.get("embedding") is not None]

    cluster_themes = []
    
    # 3. K-Means clustering over embeddings (if >= 3 entries with embeddings)
    if len(valid_embeddings) >= 3:
        try:
            from sklearn.cluster import KMeans
            
            num_clusters = min(3, len(valid_embeddings))
            X = np.array(valid_embeddings)
            kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X)

            # Group entries by cluster label
            clusters_map = {}
            for idx, label in enumerate(labels):
                clusters_map.setdefault(label, []).append(contents[idx])

            # Generate theme label for each cluster
            for c_id, c_texts in clusters_map.items():
                snippet = "\n- ".join(c_texts[:3])
                theme_prompt = f"Identify a short (3-6 word) topic/mood label summarizing these health journal entries:\n- {snippet}"
                theme_resp = client.chat.completions.create(
                    model=settings.llm_model,
                    max_tokens=60,
                    messages=[
                        {"role": "system", "content": "You are a concise topic tagger. Output only the short theme name."},
                        {"role": "user", "content": theme_prompt},
                    ],
                )
                theme_name = theme_resp.choices[0].message.content.strip().strip('"')
                cluster_themes.append(theme_name)
        except Exception:
            cluster_themes = []

    # 4. Generate overall trend analysis
    entries_bullet_list = "\n".join(
        f"[{r.get('created_at', '')[:10]}] {r['content']}"
        for r in records[:15]  # limit to top 15 entries for prompt length safety
    )

    prompt = f"Analyze the following {len(records)} recent health journal entries over the past period:\n\n{entries_bullet_list}\n\nProvide an insightful, structured summary highlighting emotional patterns, recurring physical symptoms or health concerns, and overall wellness trends."

    llm_resp = client.chat.completions.create(
        model=settings.llm_model,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": SYSTEM_TREND_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    trend_summary = llm_resp.choices[0].message.content or "Could not generate trend analysis."

    return JournalTrendResponse(
        total_entries=len(records),
        trend_summary=trend_summary,
        detected_clusters=cluster_themes,
    )
