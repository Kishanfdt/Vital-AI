"""
MILESTONE 3 - Medical Document Q&A (RAG)

Goal: user uploads a lab report or prescription PDF, then asks natural-language
questions about it ("what does my LDL number mean?").

Build steps:
1. POST /documents/upload - accept a PDF via UploadFile, extract text with
   pypdf, chunk it (~500 tokens per chunk with slight overlap is a reasonable
   starting point), and store raw bytes in Supabase Storage.
2. Embed each chunk. Anthropic doesn't serve an embeddings endpoint directly,
   so use a dedicated embeddings model - Voyage AI is Anthropic's recommended
   partner (voyage-3) and has a generous free tier. Store the resulting
   vector in the `documents.embedding` column (see schema.sql, vector(1024)
   if using voyage-3-lite, adjust dimension to match your model).
3. POST /documents/ask - embed the user's question the same way, call the
   `match_documents` Postgres function from schema.sql to retrieve the top-k
   relevant chunks for that user, then pass those chunks as context to Claude
   with a system prompt like: "Answer using only the provided context. If the
   context doesn't contain the answer, say so."
4. Chunk size and overlap tuning is where most of the real learning happens -
   expect to iterate.

Reference: https://docs.voyageai.com/docs/embeddings
"""

from fastapi import APIRouter, Depends, UploadFile
from app.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/health")
def placeholder(user_id: str = Depends(get_current_user)):
    return {"status": "not yet implemented - see module docstring for build plan"}
