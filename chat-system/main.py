from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
from dashboard import chat_manager
from mcp_client import call_mcp_tool

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
    # Call MCP server using the client
    try:
        result_text = await call_mcp_tool("handle_chat", {
            "message": req.message,
            "session_id": req.session_id
        })
        
        if result_text and "MCP server error" not in result_text:
            handover = "handover" in result_text.lower() or "support team" in result_text.lower()
            
            if handover:
                await chat_manager.add_chat(req.session_id, req.message)
            
            return {"answer": result_text, "handover": handover}
        
        # Fallback to human support
        await chat_manager.add_chat(req.session_id, req.message)
        return {"answer": "I'm connecting you to our support team. Please wait a moment.", "handover": True}
        
    except Exception as e:
        print(f"MCP error: {e}")
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