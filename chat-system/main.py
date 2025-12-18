
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
        # Check if user provided date and resort name
        import re
        from datetime import datetime
        
        # Look for date patterns (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
        date_patterns = [
            r'(\d{4}-\d{2}-\d{2})',
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2})'
        ]
        
        found_date = None
        for pattern in date_patterns:
            match = re.search(pattern, req.message)
            if match:
                found_date = match.group(1)
                break
        
        if not found_date:
            try:
                response = requests.get(f"{RESORT_API_URL}/resorts")
                if response.status_code == 200:
                    resorts = response.json()
                    resort_list = "\n".join([f"{i+1}. {r['name']} - {r['location']}" for i, r in enumerate(resorts[:5])])
                    return {"answer": f"To check availability, please provide:\n\n📅 **Check-in Date** (YYYY-MM-DD format)\n🏨 **Resort Name**\n\nAvailable resorts:\n{resort_list}\n\nExample: 'Check availability for Resort Paradise on 2024-12-25'", "handover": False}
            except:
                return {"answer": "Please provide the check-in date (YYYY-MM-DD) and resort name to check availability.", "handover": False}
        
        # If date is provided, check for resort name and availability
        try:
            resorts_response = requests.get(f"{RESORT_API_URL}/resorts")
            bookings_response = requests.get(f"{RESORT_API_URL}/bookings")
            
            if resorts_response.status_code == 200 and bookings_response.status_code == 200:
                resorts = resorts_response.json()
                bookings = bookings_response.json()
                
                # Find matching resort
                selected_resort = None
                for resort in resorts:
                    if resort['name'].lower() in text:
                        selected_resort = resort
                        break
                
                if not selected_resort:
                    resort_list = "\n".join([f"{i+1}. {r['name']} - {r['location']}" for i, r in enumerate(resorts[:5])])
                    return {"answer": f"Please specify which resort you'd like to check for {found_date}:\n\n{resort_list}", "handover": False}
                
                # Check if resort is booked on that date
                is_booked = False
                for booking in bookings:
                    if (booking.get('resort_id') == selected_resort['id'] and 
                        booking.get('check_in') <= found_date <= booking.get('check_out', found_date)):
                        is_booked = True
                        break
                
                if is_booked:
                    return {"answer": f"❌ **{selected_resort['name']}** is already booked on {found_date}.\n\nPlease try a different date or resort.", "handover": False}
                else:
                    return {"answer": f"✅ **{selected_resort['name']}** is available on {found_date}!\n\n💰 **Price:** ₹{selected_resort['price']}/night\n📍 **Location:** {selected_resort['location']}\n\nWould you like to proceed with booking?", "handover": False}
        except Exception as e:
            return {"answer": "Sorry, I couldn't check availability right now. Please try again later.", "handover": False}
    
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
    chat_manager.user_connections[session_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            await chat_manager.add_message(session_id, message_data["message"], "user")
    except WebSocketDisconnect:
        if session_id in chat_manager.user_connections:
            del chat_manager.user_connections[session_id]
