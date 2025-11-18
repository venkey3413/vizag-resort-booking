from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any, List

from rag_graph import run_agent
from database_service import DatabaseService

app = FastAPI(title="Vizag Resort Booking AI Chat")

# Allow your domain (and localhost for testing)
origins = [
    "https://vizagresortbooking.in",
    "http://vizagresortbooking.in",
    "http://localhost",
    "http://localhost:3000",
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

# Initialize database service
db_service = DatabaseService()

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

# Database endpoints for chat widget
@app.get("/api/data/resorts")
async def get_resorts():
    try:
        return db_service.get_resorts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/booking/{reference}")
async def get_booking(reference: str):
    try:
        booking = db_service.get_booking(reference)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return booking
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/food-order/{order_id}")
async def get_food_order(order_id: str):
    try:
        order = db_service.get_food_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Food order not found")
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/travel-booking/{reference}")
async def get_travel_booking(reference: str):
    try:
        booking = db_service.get_travel_booking(reference)
        if not booking:
            raise HTTPException(status_code=404, detail="Travel booking not found")
        return booking
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/food-items")
async def get_food_items():
    try:
        return db_service.get_food_items()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/travel-packages")
async def get_travel_packages():
    try:
        return db_service.get_travel_packages()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/availability/{resort_id}/{date}")
async def check_availability(resort_id: int, date: str):
    try:
        return db_service.check_availability(resort_id, date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/stats")
async def get_stats():
    try:
        return db_service.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/recent-bookings")
async def get_recent_bookings(limit: int = 5):
    try:
        return db_service.get_recent_bookings(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/search-bookings/{query}")
async def search_bookings(query: str):
    try:
        return db_service.search_bookings(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))