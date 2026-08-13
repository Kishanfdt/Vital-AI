import io
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pypdf import PdfReader
from app.models import DocumentUploadResponse, DocumentAskRequest, DocumentAskResponse, DocumentItem
from app.auth import get_current_user
from app.database import supabase
from app.config import settings
from app.services.llm import client

router = APIRouter(prefix="/documents", tags=["documents"])

SYSTEM_RAG_PROMPT = """You are a medical document assistant. Your task is to answer the user's question using ONLY the provided document context below.

Rules:
1. Base your answer strictly on the facts present in the provided context.
2. If the provided context does not contain enough information to answer the question, clearly state: "I cannot find enough information in your uploaded documents to answer this question."
3. Do not invent details, infer unstated medical diagnoses, or use outside assumptions.
4. Keep your answer clear, accurate, and professional."""


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Splits text into chunks of ~chunk_size words with ~overlap words overlap.
    """
    words = text.split()
    if not words:
        return []
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def get_voyage_embeddings(texts: list[str], input_type: str = "document") -> list[list[float]]:
    """
    Obtains 1024-dimensional embeddings from Voyage AI API (voyage-3).
    """
    if not settings.voyage_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VOYAGE_API_KEY is not configured in environment variables. Please add VOYAGE_API_KEY to your .env file to enable document embedding."
        )

    url = "https://api.voyageai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.voyage_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": texts,
        "model": "voyage-3",
        "input_type": input_type,
    }

    try:
        with httpx.Client() as http_client:
            resp = http_client.post(url, json=payload, headers=headers, timeout=30.0)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Voyage AI API error ({resp.status_code}): {resp.text}"
                )
            data = resp.json()
            return [item["embedding"] for item in data["data"]]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to communicate with Voyage AI embeddings API: {str(e)}"
        )


@router.post("/upload", response_model=DocumentUploadResponse)
def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )

    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 1. Extract text from PDF
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                extracted_text += t + "\n"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse PDF file: {str(e)}"
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract readable text from PDF (file may be scanned image or empty)."
        )

    # 2. Chunk text (~500 words, ~50 word overlap)
    chunks = chunk_text(extracted_text, chunk_size=500, overlap=50)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to generate text chunks from document."
        )

    filename = file.filename
    file_path = f"{user_id}/{filename}"

    # 3. Store raw file in Supabase Storage (best effort)
    try:
        supabase.storage.create_bucket("documents", options={"public": False})
    except Exception:
        pass  # Bucket may already exist

    try:
        supabase.storage.from_("documents").upload(
            file_path,
            file_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )
    except Exception:
        pass  # Best effort storage save

    # 4. Generate embeddings via Voyage AI
    embeddings = get_voyage_embeddings(chunks, input_type="document")

    # 5. Save chunk records to database
    rows_to_insert = [
        {
            "user_id": user_id,
            "file_path": file_path,
            "chunk_text": chunk,
            "embedding": vec,
        }
        for chunk, vec in zip(chunks, embeddings)
    ]

    # Batch insert rows into Supabase
    supabase.table("documents").insert(rows_to_insert).execute()

    return DocumentUploadResponse(
        file_path=file_path,
        filename=filename,
        chunks_count=len(chunks),
        message=f"Document successfully processed and indexed into {len(chunks)} text chunks.",
    )


@router.post("/ask", response_model=DocumentAskResponse)
def ask_document(
    request: DocumentAskRequest,
    user_id: str = Depends(get_current_user)
):
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    # 1. Embed query vector
    query_embeddings = get_voyage_embeddings([request.question.strip()], input_type="query")
    query_vec = query_embeddings[0]

    # 2. Vector search via Supabase match_documents RPC
    try:
        rpc_res = supabase.rpc("match_documents", {
            "query_embedding": query_vec,
            "match_user_id": user_id,
            "match_count": 5,
        }).execute()
        matched_chunks = rpc_res.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database vector search failed: {str(e)}"
        )

    if not matched_chunks:
        return DocumentAskResponse(
            answer="No relevant context found in your uploaded documents. Please ensure you have uploaded documents.",
            sources=[],
        )

    # 3. Construct context prompt
    context_str = "\n\n".join(
        f"--- Document Chunk {idx + 1} ---\n{c['chunk_text']}"
        for idx, c in enumerate(matched_chunks)
    )

    user_prompt = f"DOCUMENT CONTEXT:\n{context_str}\n\nUSER QUESTION: {request.question}"

    # 4. Generate LLM response
    response = client.chat.completions.create(
        model=settings.llm_model,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": SYSTEM_RAG_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    answer = response.choices[0].message.content or "No response produced."
    sources = [c["chunk_text"] for c in matched_chunks]

    return DocumentAskResponse(answer=answer, sources=sources)


@router.get("", response_model=list[DocumentItem])
def list_documents(user_id: str = Depends(get_current_user)):
    # Retrieve user's document chunks and deduplicate by file_path
    rows = (
        supabase.table("documents")
        .select("file_path, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    docs_map = {}
    for row in rows:
        fp = row["file_path"]
        if fp not in docs_map:
            filename = fp.split("/")[-1]
            docs_map[fp] = {
                "file_path": fp,
                "filename": filename,
                "chunks_count": 1,
                "created_at": row.get("created_at"),
            }
        else:
            docs_map[fp]["chunks_count"] += 1

    return list(docs_map.values())
