
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
import re
import json
from datetime import datetime
from dashboard import chat_manager

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add CORS middleware
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resort API base URL
RESORT_API_URL = "http://centralized-db-api:3003/api"

class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/api/chat")
async def chat(req: ChatRequest):
    text = req.message.lower()
    
    # Check for resort availability queries
    if any(word in text for word in ["available", "availability", "book", "resort"]):
        try:
            response = requests.get(f"{RESORT_API_URL}/resorts")
            if response.status_code == 200:
                resorts = response.json()
                available_resorts = [r for r in resorts if r.get('available', True)]
                
                if available_resorts:
                    resort_list = "\n".join([f"• {r['name']} - ₹{r['price']}/night at {r['location']}" for r in available_resorts[:3]])
                    return {"answer": f"Available resorts:\n{resort_list}\n\nWould you like to make a booking?", "handover": False}
                else:
                    return {"answer": "No resorts are currently available. Please try again later.", "handover": False}
        except:
            pass
    
    # Check for booking ID queries
    match = re.search(r"(\d{3,10})", text)
    booking_id = match.group(1) if match else None

    if "booking" in text and booking_id:
        try:
            response = requests.get(f"{RESORT_API_URL}/bookings")
            if response.status_code == 200:
                bookings = response.json()
                booking = next((b for b in bookings if str(b['id']) == booking_id), None)
                if booking:
                    return {"answer": f"Booking {booking_id}:\nGuest: {booking['guest_name']}\nResort: {booking.get('resort_name', 'N/A')}\nDates: {booking['check_in']} to {booking['check_out']}\nStatus: {booking.get('payment_status', 'pending')}", "handover": False}
        except:
            pass

    if "refund" in text or "cancel" in text:
        return {"answer": "Refund Policy:\n• Full refund if cancelled 24 hours before check-in\n• 50% refund if cancelled within 24 hours\n• No refund for no-shows\n\nNeed help with cancellation? I'll connect you to support.", "handover": True}

    # Handover to human support
    await chat_manager.add_chat(req.session_id, req.message)
    return {"answer": "I'm connecting you to our support team. Please wait a moment.", "handover": True}

@app.websocket("/ws/chat/{session_id}")
async def chat_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            await chat_manager.add_message(session_id, message_data["message"], "user")
    except:
        pass
