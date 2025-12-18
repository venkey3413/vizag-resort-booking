
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
    
    # Try MCP server first for all queries
    try:
        mcp_response = requests.post("http://127.0.0.1:3004/chat", json={
            "message": req.message,
            "session_id": req.session_id
        }, timeout=5)
        
        if mcp_response.status_code == 200:
            result = mcp_response.json()
            if result.get("response"):
                return {"answer": result["response"], "handover": result.get("handover", False)}
    except Exception as e:
        print(f"MCP server error: {e}")
    
    # Fallback responses
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
