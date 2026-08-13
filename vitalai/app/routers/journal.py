"""
MILESTONE 4 - Wellness Journal with Trend Analysis

The CRUD below (create + list entries) is fully working now. The trend-analysis
endpoint is the learning milestone:

Build steps for /journal/trends:
1. Pull the user's last N entries (e.g. last 30 days) from `journal_entries`.
2. Rather than embeddings-based clustering (harder to get right early on),
   start simple: concatenate the entries and ask Claude to summarize emotional
   trends directly - this alone teaches you long-context summarization.
3. Once that works, level up: embed each entry (see documents.py notes on
   embedding models), and use those vectors to detect topic clusters or mood
   shifts over time before summarizing - this is the "harder mode" version
   that's genuinely portfolio-worthy.
"""

from fastapi import APIRouter, Depends
from app.models import JournalEntryCreate
from app.auth import get_current_user
from app.database import supabase

router = APIRouter(prefix="/journal", tags=["journal"])


@router.post("")
def create_entry(entry: JournalEntryCreate, user_id: str = Depends(get_current_user)):
    result = supabase.table("journal_entries").insert({
        "user_id": user_id,
        "content": entry.content,
    }).execute()
    return result.data[0]


@router.get("")
def list_entries(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("journal_entries")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/trends")
def trends(user_id: str = Depends(get_current_user)):
    return {"status": "not yet implemented - see module docstring for build plan"}
