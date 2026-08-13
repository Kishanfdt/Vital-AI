# VitalAI

> A full-stack AI health companion — FastAPI · React/Vite · Groq (Llama 3.3 70B) · Voyage AI · Supabase (pgvector)

VitalAI started as a set of LLM engineering experiments and grew into a portfolio-complete full-stack product: authenticated, multi-featured, RAG-backed, with a clinical-grade PDF export and a cohesive visual design system.

---

## Live Feature Status

| Feature | Routes | Status |
|---|---|---|
| **Symptom Triage** | `POST /triage` | ✅ Working |
| **Wellness Coach Chat** (streaming SSE) | `POST /chat` | ✅ Working |
| **Medications + OpenFDA Interaction Check** | `GET/POST/DELETE /medications` | ✅ Working |
| **Medical Document Q&A** (RAG) | `POST /documents/upload`, `POST /documents/ask` | ✅ Working |
| **Health Journal + Trend Analysis** (k-means + LLM) | `POST/GET /journal`, `GET /journal/trends` | ✅ Working |
| **Insights & Analytics** | `GET /triage/history`, `GET /insights` | ✅ Working |
| **Care Coordination + PDF Summary** | `GET/POST/PATCH/DELETE /appointments`, `GET /appointments/summary-pdf` | ✅ Working |

**7 of 7 features complete.**

---

## Design Direction

VitalAI's visual language is intentionally positioned between two failure modes: the coldness of a hospital portal, and the flakiness of a wellness app. The register is *calm clinical confidence with warm humanity*.

**Palette**
- `--deep-teal: #0f3d3a` — trust anchor; primary actions and section headers
- `--teal-soft: #2d5c56` — secondary teal for hover states and sub-elements
- `--clay: #c76f4f` — warm accent; one signature moment per screen (active nav state, CTA highlight)
- `--sage: #7fa896` — supporting mid-tone; borders, icons, soft fills
- `--paper: #f6f3ec` — warm off-white background (not pure white — reduces clinical harshness)
- `--success: #3d7a5c` / `--warning: #b8823a` — status indicators, distinct from urgency badge colours

**Typography**
- **Fraunces** (optical-size variable serif, 400/500/600) — display headings. Brings warmth and editorial quality without feeling informal.
- **Inter** (400/500/600) — body, labels, UI text. Clinically legible at small sizes.

**The signature moment**
The sidebar active state uses `box-shadow: inset 3px 0 0 var(--clay)` — a left-edge clay accent bar — as the single recurring use of the warm accent. Every other interactive element uses teal. One colour doing one job.

**Motion**
All transitions use `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard ease) at 150–250ms. Route changes animate with a page-enter (`translateY(8px) → 0 + fade`) keyed by `location.pathname`.

**Shadows**
Warm teal-based (not black): `rgba(15, 61, 58, 0.07–0.13)` — so shadows harmonise with the surface colour rather than fighting it.

---

## Architecture

```
vitalai/
├── app/
│   ├── main.py              # FastAPI app + CORS + router registration
│   ├── auth.py              # JWT verification via Supabase secret
│   ├── config.py            # Settings from os.environ (no pydantic-settings)
│   ├── database.py          # Supabase service-role client
│   ├── models.py            # All Pydantic request/response models
│   ├── services/
│   │   └── llm.py           # Groq/OpenAI-compat client, structured output, embeddings
│   └── routers/
│       ├── triage.py        # POST /triage, GET /triage/history
│       ├── chat.py          # POST /chat (streaming)
│       ├── medications.py   # CRUD + OpenFDA interaction check
│       ├── documents.py     # PDF upload → chunk → embed → match_documents RPC
│       ├── journal.py       # CRUD + Voyage embeddings + k-means trend analysis
│       └── appointments.py  # CRUD + GET /summary-pdf (fpdf2)
├── frontend/
│   └── src/
│       ├── App.jsx           # Auth shell, route-keyed page-enter animation
│       ├── index.css         # Design System v2 (all tokens, no TailwindCSS)
│       └── components/
│           ├── Sidebar.jsx         # Collapsible sidebar + mobile drawer
│           ├── Overview.jsx        # Health Summary hub (live trend + insights widget)
│           ├── InsightsPanel.jsx   # recharts analytics (stacked bar, area, clusters)
│           ├── AppointmentsPanel.jsx
│           ├── TriagePanel.jsx
│           ├── ChatPanel.jsx
│           ├── MedicationsPanel.jsx
│           ├── DocumentsPanel.jsx
│           ├── JournalPanel.jsx
│           ├── EmptyState.jsx      # SVG line-art empty state illustrations
│           ├── Spinner.jsx         # Spinner + SkeletonLines
│           └── Toast.jsx           # Toast notification system
├── schema.sql          # Idempotent — safe to re-run (DROP POLICY IF EXISTS guards)
├── requirements.txt
└── .env.example
```

---

## LLM Engineering Skills Demonstrated

This project is intentionally sequenced so each milestone teaches a distinct technique:

| # | Technique | Where |
|---|---|---|
| 1 | **Structured output** via tool-choice forcing | `/triage` — guaranteed JSON schema |
| 2 | **External tool calling** (OpenFDA API) | `/medications/check` |
| 3 | **RAG** — chunk, embed, vector similarity, grounded answer | `/documents` |
| 4 | **Semantic embeddings for analysis** + k-means clustering | `/journal/trends` |
| 5 | **Streaming** (SSE-style) + conversation memory | `/chat` |
| 6 | **Aggregation dashboard** — multi-source data visualisation | `/insights` (recharts) |
| 7 | **Document generation** — fpdf2 PDF with LLM-written narrative | `/appointments/summary-pdf` |

---

## The PDF Summary — Portfolio Highlight

`GET /appointments/summary-pdf` generates a doctor-ready PDF combining:

- Upcoming / recent appointments with notes
- Full current medication list (striped table)
- Last 3 triage assessments with urgency labels
- LLM-generated 3–5 sentence clinical paragraph summarising recent journal trends
- Disclaimer footer on every page

This is the most tangible demonstration of "LLM as a layer in a document pipeline" — not a chatbot response, but a structured output formatted for a real-world use case.

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- [Groq API key](https://console.groq.com) (free)
- [Voyage AI key](https://dashboard.voyageai.com) (free tier, for RAG + journal embeddings)

### 1. Supabase Setup

1. Create a project at supabase.com.
2. Enable the `pgvector` extension: **Dashboard → Database → Extensions → vector**.
3. Run [`schema.sql`](./schema.sql) in the **SQL Editor** — creates all tables, RLS policies, and the `match_documents` RPC. The script is idempotent (safe to re-run).

### 2. Backend

```bash
cd vitalai
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # then fill in your keys
uvicorn app.main:app --reload
```

**Environment variables** (`.env`):

```env
GROQ_API_KEY=gsk_...
VOYAGE_API_KEY=pa-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

Interactive API docs: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd vitalai/frontend
npm install
cp .env.example .env           # set VITE_API_URL=http://localhost:8000
npm run dev                    # http://localhost:5173
```

---

## Getting a Test Auth Token (Backend-only testing)

Every endpoint requires a Supabase JWT. For Swagger/curl testing:

```python
from supabase import create_client
sb = create_client("<SUPABASE_URL>", "<SUPABASE_ANON_KEY>")
result = sb.auth.sign_in_with_password({"email": "test@example.com", "password": "yourpassword"})
print(result.session.access_token)
```

Use the token in Swagger's **Authorize** button, or as `Authorization: Bearer <token>` in curl.

---

## Quick Test

```bash
# Symptom triage
curl -X POST http://localhost:8000/triage \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "sharp chest pain and shortness of breath for the last hour", "age": 45}'

# Get triage history for analytics
curl http://localhost:8000/triage/history \
  -H "Authorization: Bearer <your-token>"

# Download health summary PDF
curl http://localhost:8000/appointments/summary-pdf \
  -H "Authorization: Bearer <your-token>" \
  --output summary.pdf
```

---

## Demo Walkthrough (Full Click-Through)

For a complete product demo, follow this sequence:

1. **Sign up / Log in** — email+password via Supabase Auth
2. **Overview** — health summary hub with live wellness trend and insights widget
3. **Insights** — analytics dashboard: stacked triage urgency chart, journal activity area chart, cluster tag cloud, medication timeline
4. **Appointments** — log a visit, add pre-visit notes, then after the visit add post-visit notes
5. **Symptom Check** — enter symptoms to get an urgency classification with next steps
6. **Coach Chat** — ask about sleep, stress, or nutrition (streaming response)
7. **Medications** — add meds, then run the OpenFDA interaction check
8. **Documents Q&A** — upload a PDF lab report, ask a grounded question
9. **Health Journal** — log an entry, then run the 30-day trend analysis
10. **Generate PDF** — navigate to Appointments → click *Visit Summary PDF* → opens a formatted A4 download

> **Recording a demo GIF/video**: use [OBS Studio](https://obsproject.com/) (free) to screen-record a click-through. Trim to 60–90 seconds. Tools like [Kap](https://getkap.co/) (macOS) or [ScreenToGif](https://www.screentogif.com/) (Windows) can export directly to GIF. Add it to this README using `![Demo](./demo.gif)`.

---

## Security Notes

- All endpoints use `Depends(get_current_user)` — no user_id accepted from request bodies.
- RLS policies ensure every table row is scoped to `auth.uid() = user_id`.
- No secrets are hardcoded — all sensitive values come from `.env` via `os.environ`.
- Every triage/chat/document/journal response includes a medical disclaimer. System prompts explicitly prohibit diagnosis and medication dosage recommendations.

> **Important**: If you shared API keys during development or debugging, rotate them before publishing: [Groq](https://console.groq.com) · [Voyage AI](https://dashboard.voyageai.com) · Supabase (Project Settings → API).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI 0.115 |
| LLM inference | Groq (Llama 3.3 70B Versatile) |
| Embeddings | Voyage AI (`voyage-3-lite`) |
| Database + Auth | Supabase (Postgres + pgvector + RLS) |
| PDF generation | fpdf2 2.8 |
| Frontend framework | React 18 + Vite 5 |
| Charting | Recharts |
| Icons | Lucide React |
| Styling | Vanilla CSS (Design System v2, no Tailwind) |
| Auth client | Supabase JS SDK |
