# VitalAI

A multi-featured LLM-powered health & wellness API built with FastAPI, Groq (Llama 3.3 70B), Voyage AI, and Supabase.

## Status

| Feature | Endpoint | Status |
|---|---|---|
| Symptom triage | `POST /triage` | ✅ Working |
| Wellness coach chat (streaming) | `POST /chat` | ✅ Working |
| Journal entries (CRUD) | `POST/GET /journal` | ✅ Working |
| Journal trend analysis | `GET /journal/trends` | ✅ Working (Milestone 4) |
| Medication interaction checker | `/medications` | ✅ Working (Milestone 2) |
| Document Q&A (RAG) | `/documents` | ✅ Working (Milestone 3) |

Each router is fully implemented and operational.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run `schema.sql`** in the Supabase SQL editor to create tables, enable pgvector, and set up RLS.
3. **Copy `.env.example` to `.env`** and fill in:
   - `GROQ_API_KEY` - from console.groq.com
   - `VOYAGE_API_KEY` - from console.voyageai.com (for document RAG & journal embeddings)
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - Project Settings -> API
   - `SUPABASE_JWT_SECRET` - Project Settings -> API -> JWT Settings
4. **Install dependencies:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # on Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
5. **Run the server:**
   ```bash
   uvicorn app.main:app --reload
   ```
6. Visit `http://localhost:8000/docs` for interactive Swagger UI - this is the fastest way to test endpoints.

## Getting a test auth token

Every endpoint except `/` requires a Supabase-issued JWT. Easiest way to get one while developing:

1. In the Supabase dashboard, go to Authentication -> Users -> Add user (create a test user with email/password).
2. Use the Supabase client SDK in a throwaway script to sign in and print the access token:
   ```python
   from supabase import create_client
   sb = create_client("<SUPABASE_URL>", "<SUPABASE_ANON_KEY>")  # anon key, not service role, for this call
   result = sb.auth.sign_in_with_password({"email": "test@example.com", "password": "yourpassword"})
   print(result.session.access_token)
   ```
3. Use that token in Swagger UI's Authorize button, or as `Authorization: Bearer <token>` in curl/Postman.

## Try it

```bash
curl -X POST http://localhost:8000/triage \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "sharp chest pain and shortness of breath for the last hour", "age": 45}'
```

## Build order

This project is intentionally sequenced so each milestone teaches a distinct LLM engineering skill:

1. ✅ **Structured output** (`/triage`) - forcing reliable JSON via tool-choice forcing
2. ✅ **Tool calling** (`/medications`) - letting the model decide when to call an external API
3. ✅ **RAG** (`/documents`) - chunking, embeddings, vector similarity search
4. ✅ **Embeddings for analysis** (`/journal/trends`) - semantic trend detection over time
5. ✅ **Streaming + memory** (`/chat`) - SSE-style responses, conversation state

## Important safety note

Every triage/coach response includes a disclaimer and neither endpoint is permitted (by system prompt) to issue a diagnosis or recommend specific medication dosages. Keep this constraint in place if you extend the system prompts.
