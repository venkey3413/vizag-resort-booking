from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import requests
import re
from dashboard import chat_manager

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "http://centralized-db-api:3003"

class ChatRequest(BaseModel):
    session_id: str
    message: str

import subprocess
import json
import requests

# Direct tool functions (simplified MCP tools)
def get_refund_policy():
    return """**Refund Policy:**

🔄 **Free Cancellation:** Full refund if cancelled 3+ days before check-in
💰 **Mid-window:** 75% refund between 3 days and 24 hours before check-in  
❌ **Last 24 hours:** No refund within 24 hours of check-in
⏱️ **Processing:** Refunds processed in 3-5 business days
💳 **Price Changes:** Customer pays difference when rescheduling to higher tariff"""

def get_checkin_checkout_policy():
    return """**Check-in/Check-out Policy:**

🏨 **Check-in Time:** 11:00 AM onwards
🚪 **Check-out Time:** 9:00 AM (strict)
📋 **Requirements:** Valid ID proof mandatory
🎒 **Early Arrival:** Subject to room availability
⏰ **Late Check-out:** Additional charges may apply"""

def get_resort_rules():
    return """**Resort Rules:**

🎵 **Music:** Allowed until 10:00 PM only
🍕 **Outside Food:** Not permitted in resort premises
🏊 **Pool Hours:** 6:00 AM to 8:00 PM
🚭 **Smoking:** Designated areas only
👥 **Visitors:** Day visitors allowed with prior approval
🔇 **Noise:** Maintain silence after 10:00 PM"""

def get_terms_conditions():
    return """**Terms & Conditions:**

📋 **Booking:** Advance payment required for confirmation
🆔 **ID Proof:** Mandatory at check-in
👨‍👩‍👧‍👦 **Occupancy:** Strictly as per booking details
💔 **Damage:** Guest liable for property damage
🚫 **Prohibited:** Illegal activities, pets (unless specified)
⚖️ **Disputes:** Subject to local jurisdiction"""

def list_resorts():
    try:
        response = requests.get(f"{BASE_URL}/api/resorts")
        if response.status_code == 200:
            resorts = response.json()
            if resorts:
                result = "**Available Resorts:**\n\n"
                for resort in resorts[:5]:  # Show first 5
                    result += f"🏨 **{resort.get('name', 'N/A')}**\n"
                    result += f"📍 Location: {resort.get('location', 'N/A')}\n"
                    result += f"💰 Price: ₹{resort.get('price', 'N/A')}/night\n\n"
                return result
        return "No resorts available at the moment."
    except:
        return "Unable to fetch resort information right now."

def get_booking_status(booking_id: str):
    try:
        response = requests.get(f"{BASE_URL}/api/bookings")
        if response.status_code == 200:
            bookings = response.json()
            for booking in bookings:
                if str(booking.get('id')) == str(booking_id):
                    return f"""**Booking Status for ID: {booking_id}**

👤 **Guest:** {booking.get('name', 'N/A')}
🏨 **Resort:** ID {booking.get('resortId', 'N/A')}
📅 **Check-in:** {booking.get('checkIn', 'N/A')}
📅 **Check-out:** {booking.get('checkOut', 'N/A')}
👥 **Guests:** {booking.get('guests', 'N/A')}
💳 **Payment:** {booking.get('paymentStatus', 'N/A')}
💰 **Amount:** ₹{booking.get('amountPaid', 'N/A')}
📊 **Status:** {booking.get('status', 'N/A')}"""
        return f"Booking ID {booking_id} not found."
    except:
        return "Unable to fetch booking information right now."

def find_and_call_tool(message: str):
    """Find appropriate tool based on message content"""
    text = message.lower()
    
    # Check for booking ID pattern first
    if any(char.isdigit() for char in message) and ("booking" in text or "id" in text):
        booking_id = re.search(r'\d+', message)
        if booking_id:
            return get_booking_status(booking_id.group())
    
    # Map keywords to tools (order matters - more specific first)
    if any(word in text for word in ["refund", "cancel", "cancellation"]):
        return get_refund_policy()
    
    if any(word in text for word in ["check-in", "checkout", "timing", "time"]):
        return get_checkin_checkout_policy()
    
    if any(word in text for word in ["resorts", "hotels", "properties", "available"]):
        return list_resorts()
    
    if any(word in text for word in ["terms", "conditions"]):
        return get_terms_conditions()
    
    if any(word in text for word in ["rules", "allowed", "music", "food", "pool"]):
        return get_resort_rules()
    
    return None

@app.post("/api/chat")
async def chat(req: ChatRequest):
    message = req.message
    session_id = req.session_id
    text = message.lower().strip()
    
    # Greeting - check this BEFORE tool matching
    if any(word in text for word in ["hi", "hello", "hey", "good", "start"]):
        return {"answer": "Hi, I am Keey vizag resort booking assistance. How may help you?", "handover": False}
    
    # Direct human connection request
    if any(word in text for word in ["human", "agent", "support", "talk to someone"]):
        await chat_manager.add_chat(session_id, message)
        return {"answer": "👥 **Connecting you to our support team...**\n\nA human agent will assist you shortly. Please wait a moment.", "handover": True}
    
    # Try to find and call appropriate tool
    tool_response = find_and_call_tool(message)
    
    if tool_response:
        # Tool found and executed successfully
        return {"answer": tool_response, "handover": False}
    else:
        # No tool found, redirect to human
        await chat_manager.add_chat(session_id, message)
        return {"answer": "I don't have specific information about that. Let me connect you to our support team for assistance.\n\n👥 **A human agent will help you shortly.**", "handover": True}

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