from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import triage, medications, documents, journal, chat, appointments, agent, care_circle, export_data

app = FastAPI(
    title="VitalAI",
    description="A multi-featured LLM-powered health & wellness API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https://vital-ai.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(triage.router)
app.include_router(medications.router)
app.include_router(documents.router)
app.include_router(journal.router)
app.include_router(chat.router)
app.include_router(appointments.router)
app.include_router(agent.router)
app.include_router(care_circle.router)
app.include_router(export_data.router)


@app.get("/")
def root():
    return {"service": "VitalAI", "status": "running"}