"""
care_circle.py — Caregiver / Family Sharing (Phase I)

Allows users to grant trusted family members/caregivers read-only access
to their health summary (triage checks, medications, appointments).
Raw journal entries and documents remain private to the owner.
Enforced both at the API level and at the Postgres Row Level Security (RLS) level.
"""
from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.auth import get_current_user
from app.database import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/care-circle", tags=["care-circle"])


class InviteRequest(BaseModel):
    email: EmailStr


@router.post("/invite")
def invite_caregiver(payload: InviteRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub") or current_user.get("id")
    user_email = (current_user.get("email") or "").lower()
    target_email = payload.email.strip().lower()

    if target_email == user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot invite yourself to your own care circle.",
        )

    # Check for existing invite
    existing = (
        supabase.table("care_circle")
        .select("*")
        .eq("owner_user_id", user_id)
        .eq("invited_email", target_email)
        .neq("status", "revoked")
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An active invitation already exists for {target_email}.",
        )

    # Create pending invitation
    res = (
        supabase.table("care_circle")
        .insert({
            "owner_user_id": user_id,
            "invited_email": target_email,
            "status": "pending",
            "permissions": "view_summary",
        })
        .execute()
    )

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create care circle invitation.",
        )

    return {"message": f"Invitation sent to {target_email}.", "invite": res.data[0]}


@router.get("")
def list_care_circle(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub") or current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # Shared by current user
    shared_by_me = (
        supabase.table("care_circle")
        .select("*")
        .eq("owner_user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    # Shared with current user (matching invited_email or invited_user_id)
    shared_with_me = (
        supabase.table("care_circle")
        .select("*")
        .or_(f"invited_email.eq.{user_email},invited_user_id.eq.{user_id}")
        .order("created_at", desc=True)
        .execute()
    ).data or []

    return {
        "shared_by_me": shared_by_me,
        "shared_with_me": shared_with_me,
    }


@router.post("/accept/{invite_id}")
def accept_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub") or current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # Verify invite exists and matches user email/id
    res = (
        supabase.table("care_circle")
        .select("*")
        .eq("id", invite_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    invite = res.data[0]
    if (invite.get("invited_email") or "").lower() != user_email and invite.get("invited_user_id") != user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to accept this invitation.")

    if invite.get("status") == "revoked":
        raise HTTPException(status_code=400, detail="This invitation has been revoked.")

    updated = (
        supabase.table("care_circle")
        .update({
            "status": "accepted",
            "invited_user_id": user_id,
        })
        .eq("id", invite_id)
        .execute()
    )

    return {"message": "Invitation accepted successfully.", "invite": updated.data[0] if updated.data else None}


@router.post("/revoke/{invite_id}")
def revoke_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub") or current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    res = (
        supabase.table("care_circle")
        .select("*")
        .eq("id", invite_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    invite = res.data[0]
    is_owner = invite.get("owner_user_id") == user_id
    is_invited = (
        invite.get("invited_user_id") == user_id
        or (invite.get("invited_email") or "").lower() == user_email
    )

    if not (is_owner or is_invited):
        raise HTTPException(status_code=403, detail="You are not authorized to update this invitation.")

    updated = (
        supabase.table("care_circle")
        .update({"status": "revoked"})
        .eq("id", invite_id)
        .execute()
    )

    return {"message": "Access revoked successfully.", "invite": updated.data[0] if updated.data else None}


@router.get("/{owner_user_id}/summary")
def get_shared_summary(owner_user_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub") or current_user.get("id")
    user_email = (current_user.get("email") or "").lower()

    # Check permission in care_circle
    rel = (
        supabase.table("care_circle")
        .select("*")
        .eq("owner_user_id", owner_user_id)
        .eq("status", "accepted")
        .or_(f"invited_user_id.eq.{user_id},invited_email.eq.{user_email}")
        .execute()
    )

    if not rel.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have accepted caregiver permissions for this user.",
        )

    # Fetch shared data for the owner (triage, medications, appointments)
    triage = (
        supabase.table("triage_history")
        .select("id, symptoms, urgency, reasoning, created_at")
        .eq("user_id", owner_user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    ).data or []

    medications = (
        supabase.table("medications")
        .select("id, name, dosage, created_at")
        .eq("user_id", owner_user_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    appointments = (
        supabase.table("appointments")
        .select("id, provider_name, appointment_date, reason, notes, created_at")
        .eq("user_id", owner_user_id)
        .order("appointment_date", desc=False)
        .execute()
    ).data or []

    return {
        "owner_user_id": owner_user_id,
        "triage_history": triage,
        "medications": medications,
        "appointments": appointments,
    }
