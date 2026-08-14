# 🩺 VitalAI — AI-Powered Health & Wellness Platform

VitalAI is a full-stack health and wellness web application built with **FastAPI**, **Groq AI (Llama 3.3 70B)**, **Voyage AI**, **Supabase (PostgreSQL + pgvector)**, and **React + Vite**. It demonstrates five distinct LLM engineering skills: structured output, tool calling, RAG, semantic embeddings, and streaming — each mapped to a real health feature.

---

## ✅ Feature Status

| # | Feature | Endpoints | LLM Skill | Status |
|:--|:--------|:----------|:----------|:-------|
| 1 | **AI Symptom Triage** | `POST /triage` | Structured output (forced JSON) | ✅ Complete |
| 2 | **Medication Interaction Checker** | `GET/POST/DELETE /medications`, `POST /medications/check` | Tool calling (OpenFDA via Groq) | ✅ Complete |
| 3 | **Medical Document Q&A** | `POST /documents/upload`, `POST /documents/ask`, `GET /documents` | RAG (Voyage AI + pgvector) | ✅ Complete |
| 4 | **Health Journal & Trend Analysis** | `POST/GET /journal`, `GET /journal/trends` | Embeddings + k-means clustering | ✅ Complete |
| 5 | **Streaming Wellness Coach** | `POST /chat` | Streaming SSE + conversation memory | ✅ Complete |
| 6 | **Care Coordination & PDF Summary** | `GET/POST/PUT/DELETE /appointments`, `POST /appointments/summary-pdf` | fpdf2 PDF compilation + structured summary | ✅ Complete |
| 7 | **Proactive AI Health Agent** | `GET /agent/insights`, `POST /agent/insights/refresh` | Unforced multi-tool agentic loop | ✅ Complete |
| 8 | **Caregiver / Family Sharing** | `POST /care-circle/invite`, `GET /care-circle`, `POST /accept`, `POST /revoke`, `GET /{id}/summary` | Database Postgres RLS multi-user security | ✅ Complete |
| 9 | **Platform Polish & Data Export** | `GET /export/all` | Dark Mode, Voice Input, Data Ownership export | ✅ Complete |

**UI:** Sidebar + React Router layout with Overview dashboard, Dark Mode, Voice Input, mobile-responsive drawer, toast notifications, recharts visualization, Caregiver view, and PDF generation.

---

## 🏗️ Architecture & Stack

| Layer | Technologies |
|:------|:-------------|
| **Frontend** | React 18, Vite, Vanilla CSS (design tokens), React Router v6, Supabase JS |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| **AI / LLM** | Groq API (`llama-3.3-70b-versatile`), Voyage AI (`voyage-3`), Tool Calling, SSE Streaming |
| **Database** | Supabase (PostgreSQL), pgvector, Row Level Security (RLS) |
| **External APIs** | OpenFDA Drug Label API (medication interactions) |

---

## 📁 Repository Structure

```
Vital-AI/
├── vitalai/
│   ├── app/                        # FastAPI Backend
│   │   ├── main.py                 # Entry point & CORS
│   │   ├── auth.py                 # Supabase JWT middleware
│   │   ├── config.py               # Settings & env vars
│   │   ├── database.py             # Supabase client
│   │   ├── models.py               # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── triage.py           # Symptom triage (structured output)
│   │   │   ├── chat.py             # Streaming wellness coach
│   │   │   ├── journal.py          # Journal CRUD + trend analysis
│   │   │   ├── medications.py      # Medication tracker + interaction check
│   │   │   └── documents.py        # RAG document Q&A
│   │   └── services/
│   │       └── llm.py              # Groq client
│   │
│   ├── frontend/                   # React + Vite Frontend
│   │   └── src/
│   │       ├── components/
│   │       │   ├── Sidebar.jsx     # Collapsible sidebar + mobile drawer
│   │       │   ├── Overview.jsx    # Dashboard with live trend snippet
│   │       │   ├── TriagePanel.jsx
│   │       │   ├── ChatPanel.jsx
│   │       │   ├── MedicationsPanel.jsx
│   │       │   ├── DocumentsPanel.jsx
│   │       │   ├── JournalPanel.jsx
│   │       │   ├── Login.jsx
│   │       │   ├── Toast.jsx       # Global toast notifications
│   │       │   └── Spinner.jsx     # Spinner + skeleton loaders
│   │       ├── App.jsx             # BrowserRouter + authenticated shell
│   │       ├── index.css           # Full design system (tokens, sidebar, cards)
│   │       └── supabaseClient.js
│   │
│   ├── schema.sql                  # Idempotent DB schema (pgvector, RLS, match_documents)
│   ├── requirements.txt
│   └── README.md                   # Backend-specific docs
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Supabase project** — [supabase.com](https://supabase.com)
- **Groq API key** — [console.groq.com](https://console.groq.com) (free tier)
- **Voyage AI API key** — [dashboard.voyageai.com](https://dashboard.voyageai.com) (free tier)

---

### 1. Database Setup

1. Create a Supabase project.
2. In **SQL Editor → New query**, paste and run `vitalai/schema.sql`.  
   This creates all tables, enables `pgvector`, sets RLS policies, and installs the `match_documents` similarity-search function.  
   The file is **idempotent** — safe to re-run at any time.

---

### 2. Backend

```bash
cd vitalai

# Create & activate venv
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
```

Create `vitalai/.env`:

```env
GROQ_API_KEY=your_groq_api_key
VOYAGE_API_KEY=your_voyage_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
ENVIRONMENT=development
```

Start the server:

```bash
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

---

### 3. Frontend

```bash
cd vitalai/frontend
npm install
```

Create `vitalai/frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the dev server:

```bash
npm run dev
# → http://localhost:5173
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/triage` | Structured urgency assessment from symptom description |
| `POST` | `/chat` | Streaming wellness coach (SSE) |
| `POST` | `/journal` | Create journal entry (auto-embedded with Voyage AI) |
| `GET` | `/journal` | List journal entries |
| `GET` | `/journal/trends` | 30-day trend summary + k-means topic clusters |
| `POST` | `/medications` | Add medication |
| `GET` | `/medications` | List medications |
| `DELETE` | `/medications/{id}` | Remove medication |
| `POST` | `/medications/check` | Check drug interactions via OpenFDA (tool call) |
| `POST` | `/documents/upload` | Upload PDF, extract text, chunk, embed, store |
| `POST` | `/documents/ask` | RAG Q&A grounded in uploaded documents |
| `GET` | `/documents` | List uploaded documents |
| `GET/POST` | `/appointments` | Manage appointments timeline and clinical prep notes |
| `POST` | `/appointments/summary-pdf` | Generate comprehensive Doctor Visit PDF summary |
| `GET` | `/agent/insights` | Get 60-day proactive multi-tool AI health insights (24h cached) |
| `POST` | `/agent/insights/refresh` | Force re-run multi-tool agentic loop to refresh insights |

All endpoints require `Authorization: Bearer <supabase-jwt>`. User identity is always sourced from the token — never from the request body.

---

## 🔐 Auth Notes

- All backend endpoints use `Depends(get_current_user)` — the Supabase JWT is validated server-side.
- The frontend uses `supabase-js` for sign-up / sign-in; the access token is passed as a Bearer header to the FastAPI backend.
- RLS policies ensure every database row is scoped to `auth.uid() = user_id`.

---

## 🧠 LLM Engineering Skills Demonstrated

| Milestone | Skill | Implementation |
|:----------|:------|:---------------|
| 1 | **Structured output** | `/triage` uses Groq tool-choice forcing to guarantee a typed JSON response |
| 2 | **Tool calling** | `/medications/check` lets the model decide whether to call OpenFDA; result fed back as a `tool` role message |
| 3 | **RAG** | `/documents/upload` chunks PDFs, embeds with Voyage AI, stores in pgvector; `/ask` retrieves top-k chunks as LLM context |
| 4 | **Embeddings over time** | `/journal` stores an embedding per entry; `/trends` runs k-means (k=3) to detect topic clusters before summarising |
| 5 | **Streaming** | `/chat` returns a `StreamingResponse`, streamed token-by-token to the React frontend |
| 6 | **Document Synthesis & PDF** | `/appointments/summary-pdf` compiles triage history, meds, journal trends into clinical PDF via fpdf2 |
| 7 | **Proactive Agentic Loop** | `/agent/insights` runs unforced multi-tool calling across triage, journal, and meds with 24h caching |

---

## ⚠️ Medical Disclaimer

VitalAI is **for informational and educational purposes only**. It does not provide medical diagnoses, treatment plans, or prescription recommendations. Always consult a qualified healthcare professional. In an emergency, contact local emergency services immediately.

---

## 📄 License

MIT License. See `LICENSE` for details.