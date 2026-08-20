from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.routers import triage, medications, documents, journal, chat, appointments, agent, care_circle, export_data

app = FastAPI(
    title="VitalAI",
    description="A multi-featured LLM-powered health & wellness API",
    version="0.1.0",
)


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        origin = request.headers.get("origin", "*")
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": origin if origin != "*" else "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            },
        )
    response = await call_next(request)
    origin = request.headers.get("origin", "*")
    response.headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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