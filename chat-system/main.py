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

# Tool functions (same as MCP tools but as regular functions)
def get_refund_policy():
    return "🔄 **Refund Policy:**\n\n✅ **Full refund** if cancelled 24+ hours before check-in\n🟡 **50% refund** if cancelled within 24 hours\n❌ **No refund** for no-shows\n\n📞 Contact: +91 8341674465"

def get_checkin_checkout_policy():
    return "🕐 **Check-in/Check-out Policy:**\n\n📅 **Check-in:** 11:00 AM\n📅 **Check-out:** 9:00 AM\n\n⏰ Early check-in/late check-out subject to availability"

def get_resort_rules():
    return "📋 **Resort Rules:**\n\n🎵 Music allowed until 10:00 PM\n🍽️ Outside food not allowed\n🏊 Pool timings: 6 AM - 10 PM\n🚭 No smoking in rooms"

def list_resorts():
    try:
        r = requests.get(f"{BASE_URL}/api/resorts")
        if r.status_code == 200:
            resorts = r.json()
            result = "🏨 **Available Resorts:**\n\n"
            for resort in resorts[:3]:
                result += f"**{resort['name']}**\n📍 {resort['location']}\n💰 ₹{resort['price']}/night\n\n"
            return result
        return "Sorry, couldn't fetch resort information right now."
    except:
        return "Sorry, couldn't fetch resort information right now."

def get_booking_status(booking_id: str):
    try:
        r = requests.get(f"{BASE_URL}/api/bookings")
        if r.status_code == 200:
            bookings = r.json()
            for booking in bookings:
                if str(booking.get("id")) == str(booking_id):
                    return f"📋 **Booking Status:**\n\nID: {booking.get('id')}\nGuest: {booking.get('guest_name')}\nStatus: {booking.get('payment_status')}\nDates: {booking.get('check_in')} to {booking.get('check_out')}"
            return "❌ Booking not found. Please check your booking ID."
        return "Sorry, couldn't fetch booking information right now."
    except:
        return "Sorry, couldn't fetch booking information right now."

def find_and_call_tool(message: str):
    """Find appropriate tool based on message content"""
    text = message.lower()
    
    # Check for booking ID pattern
    if any(char.isdigit() for char in message) and ("booking" in text or "id" in text):
        booking_id = re.search(r'\d+', message)
        if booking_id:
            return get_booking_status(booking_id.group())
    
    # Map keywords to functions
    if any(word in text for word in ["refund", "cancel", "cancellation"]):
        return get_refund_policy()
    
    if any(word in text for word in ["check-in", "checkout", "timing", "time"]):
        return get_checkin_checkout_policy()
    
    if any(word in text for word in ["rules", "policy", "allowed"]):
        return get_resort_rules()
    
    if any(word in text for word in ["resorts", "hotels", "properties"]):
        return list_resorts()
    
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