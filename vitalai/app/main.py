from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import triage, medications, documents, journal, chat

app = FastAPI(
    title="VitalAI",
    description="A multi-featured LLM-powered health & wellness API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(triage.router)
app.include_router(medications.router)
app.include_router(documents.router)
app.include_router(journal.router)
app.include_router(chat.router)


@app.get("/")
def root():
    return {"service": "VitalAI", "status": "running"}