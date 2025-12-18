
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
        # Parse date and resort from message
        import re
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', req.message)
        
        if date_match:
            date = date_match.group(1)
            # Try to find resort name in message
            try:
                response = requests.get(f"{RESORT_API_URL}/resorts")
                if response.status_code == 200:
                    resorts = response.json()
                    for resort in resorts:
                        if resort['name'].lower() in text:
                            # Use MCP server to check availability
                            try:
                                from mcp_client import call_mcp_tool
                                result = await call_mcp_tool("check_resort_availability", {
                                    "date": date,
                                    "resort_name": resort['name']
                                })
                                return {"answer": result, "handover": False}
                            except:
                                pass
            except:
                pass
        
        # If no date/resort found, ask for details
        try:
            from mcp_client import call_mcp_tool
            result = await call_mcp_tool("get_resort_list", {})
            return {"answer": f"To check availability, please provide:\n\n📅 **Check-in Date** (YYYY-MM-DD format)\n🏨 **Resort Name**\n\n{result}\n\nExample: 'Check availability for Resort Paradise on 2024-12-25'", "handover": False}
        except:
            return {"answer": "Please provide the check-in date (YYYY-MM-DD) and resort name to check availability.", "handover": False}
    
    # Check for booking ID queries
    match = re.search(r"(\d{3,10})", text)
    booking_id = match.group(1) if match else None

    if "booking" in text and booking_id:
        try:
            from mcp_client import call_mcp_tool
            result = await call_mcp_tool("get_booking_info", {"booking_id": booking_id})
            return {"answer": result, "handover": False}
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
