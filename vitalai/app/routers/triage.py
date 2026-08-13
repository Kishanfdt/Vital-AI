from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.models import TriageRequest, TriageResponse
from app.services.llm import get_structured_output
from app.auth import get_current_user
from app.database import supabase

router = APIRouter(prefix="/triage", tags=["triage"])

SYSTEM_PROMPT = """You are a cautious health triage assistant. You NEVER diagnose \
conditions. Your only job is to classify urgency and explain your reasoning in \
plain, calm language. Always err toward caution: if symptoms could plausibly \
indicate something serious, classify accordingly. Do not suggest specific \
medications or dosages."""

TOOL_SCHEMA = {
    "type": "object",
    "properties": {
        "urgency": {
            "type": "string",
            "enum": ["self_care", "see_doctor_soon", "seek_emergency_care"],
        },
        "reasoning": {
            "type": "string",
            "description": "Plain-language explanation of the urgency classification",
        },
        "recommended_next_steps": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-4 concrete, actionable next steps",
        },
    },
    "required": ["urgency", "reasoning", "recommended_next_steps"],
}


@router.post("", response_model=TriageResponse)
def triage_symptoms(request: TriageRequest, user_id: str = Depends(get_current_user)):
    user_message = f"Symptoms: {request.symptoms}\n"
    if request.age:
        user_message += f"Age: {request.age}\n"
    if request.duration:
        user_message += f"Duration: {request.duration}\n"
    if request.existing_conditions:
        user_message += f"Existing conditions: {', '.join(request.existing_conditions)}\n"

    result = get_structured_output(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        tool_name="submit_triage_assessment",
        tool_description="Submit a structured triage assessment",
        input_schema=TOOL_SCHEMA,
    )

    response = TriageResponse(**result)

    # Log the assessment for the user's history (non-blocking best-effort)
    try:
        supabase.table("triage_history").insert({
            "user_id": user_id,
            "symptoms": request.symptoms,
            "urgency": response.urgency,
            "reasoning": response.reasoning,
        }).execute()
    except Exception:
        pass  # don't fail the request if logging fails

    return response


@router.get("/history")
def get_triage_history(user_id: str = Depends(get_current_user)):
    """Return last 90 days of triage history for the authenticated user.
    Results are ordered newest-first, capped at 200 records.
    Used by the /insights analytics dashboard.
    """
    since = (datetime.utcnow() - timedelta(days=90)).isoformat()
    result = (
        supabase.table("triage_history")
        .select("id, urgency, symptoms, created_at")
        .eq("user_id", user_id)
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )
    return result.data or []

