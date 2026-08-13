# 🩺 VitalAI - Next-Generation AI Health & Wellness Platform

VitalAI is an intelligent, multi-featured health and wellness web application powered by **FastAPI**, **Anthropic Claude AI**, **Supabase (PostgreSQL + pgvector)**, and **React + Vite**. It provides automated symptom triage with structured JSON outputs, streaming AI wellness coaching, semantic health journaling, medication interaction checking, and RAG-based medical document Q&A.

---

## 🌟 Key Features

- **🚨 AI Symptom Triage**: Fast, structured analysis of patient symptoms with urgency assessment (Emergency, Urgent, Routine, Self-Care) and tool-forced JSON formatting.
- **💬 Streaming AI Wellness Coach**: Real-time conversational interface streaming guidance via Server-Sent Events (SSE) with persistent user context memory.
- **📓 Health Journaling & Semantic Trends**: Track daily health logs and analyze long-term health trends using vector embeddings and Supabase pgvector.
- **💊 Medication Interaction Checker**: Intelligent tool-calling engine evaluating drug-drug interactions and potential side effects.
- **📚 Medical Document RAG (Retrieval-Augmented Generation)**: Vector similarity search and document Q&A for clinical guides and personal health records.
- **🔐 Secure Authentication**: Integrated Supabase JWT authentication across all endpoints and client interfaces.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Supabase JS Client |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| **AI / LLM** | Anthropic Claude API (`claude-3-5-sonnet`), Tool Calling, SSE Streaming |
| **Database & Vector** | Supabase (PostgreSQL), `pgvector` Extension, Row Level Security (RLS) |

---

## 📁 Repository Structure

```
Vital-AI/
├── vitalai/
│   ├── app/                    # FastAPI Backend Application
│   │   ├── main.py             # Server entry point & CORS configuration
│   │   ├── auth.py             # Supabase JWT authentication middleware
│   │   ├── config.py           # Application settings & environment variables
│   │   ├── database.py         # Supabase database client setup
│   │   ├── models.py           # Pydantic data models & request/response schemas
│   │   ├── routers/            # API Route Handlers
│   │   │   ├── triage.py       # Symptom triage endpoint
│   │   │   ├── chat.py         # Streaming wellness coach chat
│   │   │   ├── journal.py      # Health journal & trend analysis
│   │   │   ├── medications.py  # Medication interaction checker
│   │   │   └── documents.py    # RAG document Q&A router
│   │   └── services/           # Service Integrations
│   │       └── llm.py          # Anthropic Claude API client & prompts
│   │
│   ├── frontend/               # React + Vite Frontend App
│   │   ├── src/
│   │   │   ├── components/     # UI Components (TriagePanel, ChatPanel, Login)
│   │   │   ├── App.jsx         # Main application layout & state management
│   │   │   ├── main.jsx        # React root renderer
│   │   │   └── supabaseClient.js # Supabase client initialization
│   │   ├── package.json        # Frontend dependencies
│   │   └── vite.config.js      # Vite build & proxy settings
│   │
│   ├── requirements.txt        # Python backend dependencies
│   ├── schema.sql              # Database schema & pgvector setup
│   └── README.md               # Backend-specific README
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Supabase Account** ([supabase.com](https://supabase.com))
- **Anthropic API Key** ([console.anthropic.com](https://console.anthropic.com))

---

### 1. Database Setup (Supabase)

1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and run the contents of [`vitalai/schema.sql`](file:///c:/Users/ckish/Downloads/vitalai/vitalai/schema.sql) to set up tables, enable `pgvector`, and configure Row Level Security (RLS).

---

### 2. Backend Setup (FastAPI)

1. Navigate to the `vitalai` directory:
   ```bash
   cd vitalai
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file inside `vitalai/`:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SUPABASE_JWT_SECRET=your_supabase_jwt_secret
   ```

5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will be live at `http://localhost:8000`. Access interactive Swagger docs at `http://localhost:8000/docs`.

---

### 3. Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd vitalai/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file inside `vitalai/frontend/`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Launch the frontend development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/triage` | Analyzes symptoms and returns structured urgency & triage JSON | ✅ Active |
| `POST` | `/chat` | Streams conversational AI wellness coach responses (SSE) | ✅ Active |
| `GET/POST` | `/journal` | Manages patient daily health journal entries | ✅ Active |
| `GET` | `/journal/trends` | Generates semantic trend analysis across journal history | 🚧 Active |
| `POST` | `/medications` | Checks drug-drug interactions & precautions | 🚧 Active |
| `POST` | `/documents` | Queries medical knowledge base via RAG | 🚧 Active |

---

## ⚠️ Medical Disclaimer & Safety Notice

VitalAI provides AI-assisted wellness coaching and symptom triaging **for informational purposes only**. It does **not** provide official medical diagnoses, treatment plans, or prescription recommendations. In case of a medical emergency, users must immediately contact local emergency services (e.g., 911).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.