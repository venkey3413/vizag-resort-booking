from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any

from rag_graph import run_agent

app = FastAPI(title="Vizag Resort Booking AI Chat")

# Allow your domain (and localhost for testing)
origins = [
    "https://vizagresortbooking.in",
    "https://www.vizagresortbooking.in",
    "https://chat.vizagresortbooking.in",
    "http://localhost",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets (logo, widget HTML, etc.)
app.mount("/static", StaticFiles(directory="static"), name="static")

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    answer: str
    handover: bool

SESSIONS: Dict[str, list[Dict[str, Any]]] = {}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    # Simple in‑memory history store (replace with DB later)
    history = SESSIONS.setdefault(req.session_id, [])
    history.append({"from": "user", "text": req.message})

    result = run_agent(req.message)
    answer = result.get("answer") or "Sorry, I couldn't generate a response."
    handover = bool(result.get("handover"))

    history.append({"from": "bot", "text": answer, "handover": handover})

    return ChatResponse(answer=answer, handover=handover)

@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    return SESSIONS.get(session_id, [])