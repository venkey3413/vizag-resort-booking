from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
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

class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/api/chat")
async def chat(req: ChatRequest):
    message = req.message
    session_id = req.session_id
    text = message.lower().strip()
    
    # Human connection request
    if any(word in text for word in ["human", "agent", "support", "help", "talk to someone"]):
        await chat_manager.add_chat(session_id, message)
        return {"answer": "👥 **Connecting you to our support team...**\n\nA human agent will assist you shortly. Please wait a moment.", "handover": True}
    
    # Greeting
    if any(word in text for word in ["hi", "hello", "hey", "good", "start"]):
        return {"answer": "Hi! I'm Keey, your resort booking assistant.\n\nI can help connect you with our support team for any questions about bookings, resorts, or services.\n\n👥 **Type 'human' to connect with our support team**", "handover": False}
    
    # Default response - connect to human
    await chat_manager.add_chat(session_id, message)
    return {"answer": "I'm connecting you to our support team for assistance.\n\n👥 **A human agent will help you shortly.**", "handover": True}

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