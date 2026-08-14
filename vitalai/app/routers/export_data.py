"""
export_data.py — Full Data Export (Phase J)

Provides GET /export/all endpoint returning a complete JSON bundle of all user records
(triage history, journal entries, medications, appointments, documents metadata)
enabling complete data ownership & portability.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.auth import get_current_user
from app.database import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])


@router.get("/all")
def export_all_data(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub") or current_user.get("id")
    user_email = current_user.get("email") or ""

    try:
        triage = (
            supabase.table("triage_history")
            .select("id, symptoms, urgency, reasoning, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        ).data or []

        journal = (
            supabase.table("journal_entries")
            .select("id, content, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        ).data or []

        medications = (
            supabase.table("medications")
            .select("id, name, dosage, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        ).data or []

        appointments = (
            supabase.table("appointments")
            .select("id, provider_name, appointment_date, reason, notes, created_at")
            .eq("user_id", user_id)
            .order("appointment_date", desc=True)
            .execute()
        ).data or []

        documents = (
            supabase.table("documents")
            .select("id, file_path, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        ).data or []

        payload = {
            "export_metadata": {
                "user_id": user_id,
                "user_email": user_email,
                "exported_at": datetime.now(tz=timezone.utc).isoformat(),
                "service": "VitalAI Health Platform",
                "version": "1.0",
            },
            "triage_history": triage,
            "journal_entries": journal,
            "medications": medications,
            "appointments": appointments,
            "documents": documents,
        }

        return JSONResponse(
            content=payload,
            headers={
                "Content-Disposition": f'attachment; filename="vitalai_export_{user_id[:8]}.json"'
            },
        )
    except Exception as e:
        logger.error("Data export failed: %s", e)
        raise HTTPException(status_code=500, detail="Data export failed. Please try again.")
