from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.llm import stream_chat
from app.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """You are a supportive wellness coach. You give general \
lifestyle, nutrition, and stress-management guidance. You are not a doctor \
and must say so if the user asks something that requires medical expertise, \
directing them to the /triage endpoint or a real clinician instead."""


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("")
def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    """
    Streams the assistant's reply as plain text chunks (Server-Sent-Events-
    style). The client (frontend or curl -N) reads this incrementally instead
    of waiting for the full response.

    NOTE: conversation memory here is stateless - the caller must resend the
    full message history each time (see anthropic_api docs on context
    management). A future improvement: persist messages to Supabase per
    session and rehydrate server-side instead of trusting the client.
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def generate():
        yield from stream_chat(SYSTEM_PROMPT, messages)

    return StreamingResponse(generate(), media_type="text/plain")
