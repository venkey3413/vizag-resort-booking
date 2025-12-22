from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import re
import json

from dashboard import chat_manager
from mcp.client import ClientSession

# --------------------------------------------------
# App setup
# --------------------------------------------------
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# MCP Client setup (CRITICAL)
# --------------------------------------------------
mcp_process = subprocess.Popen(
    ["vizag-mcp-server"],  # must match your MCP server name
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE
)

mcp_session = ClientSession(
    stdin=mcp_process.stdin,
    stdout=mcp_process.stdout
)

# --------------------------------------------------
# Models
# --------------------------------------------------
class ChatRequest(BaseModel):
    session_id: str
    message: str

# --------------------------------------------------
# Intent → Tool Router
# --------------------------------------------------
async def route_to_mcp_tool(message: str):
    text = message.lower()

    # Extract booking ID if present
    match = re.search(r"\b(\d{3,10})\b", text)
    booking_id = match.group(1) if match else None

    # ---- Booking ----
    if any(k in text for k in ["booking summary", "booking details", "full booking"]):
        if booking_id:
            return await mcp_session.call_tool(
                "get_full_booking_summary",
                booking_id=booking_id
            )

    if "booking" in text and booking_id:
        return await mcp_session.call_tool(
            "get_booking_status",
            booking_id=booking_id
        )

    # ---- Availability / Resorts ----
    if any(k in text for k in ["available", "availability", "resorts"]):
        return await mcp_session.call_tool("list_resorts")

    # ---- Policies ----
    if any(k in text for k in ["refund", "cancel", "cancellation"]):
        return await mcp_session.call_tool("get_refund_policy")

    if any(k in text for k in ["check-in", "checkout", "timing"]):
        return await mcp_session.call_tool("get_checkin_checkout_policy")

    if any(k in text for k in ["rules", "music", "food", "pool"]):
        return await mcp_session.call_tool("get_resort_rules")

    if any(k in text for k in ["terms", "conditions"]):
        return await mcp_session.call_tool("get_terms_conditions")

    return None

# --------------------------------------------------
# Chat API
# --------------------------------------------------
@app.post("/api/chat")
async def chat(req: ChatRequest):
    text = req.message.lower()

    # Greeting
    if any(w in text for w in ["hi", "hello", "hey"]):
        return {
            "answer": "Hi 👋 I’m **Keey**, your Vizag Resort Booking Assistant. How can I help you today?",
            "handover": False
        }

    # Explicit human request
    if any(w in text for w in ["human", "agent", "support", "talk to someone"]):
        await chat_manager.add_chat(req.session_id, req.message)
        return {
            "answer": "👥 Connecting you to a human agent. Please wait…",
            "handover": True
        }

    # MCP Tool handling
    tool_response = await route_to_mcp_tool(req.message)

    if tool_response:
        return {
            "answer": tool_response,
            "handover": False
        }

    # Fallback → Human
    await chat_manager.add_chat(req.session_id, req.message)
    return {
        "answer": "I’m not fully sure about this. Let me connect you to a human agent for assistance.",
        "handover": True
    }

# --------------------------------------------------
# WebSocket (Human Dashboard)
# --------------------------------------------------
@app.websocket("/ws/chat/{session_id}")
async def chat_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    chat_manager.user_connections[session_id] = websocket

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            await chat_manager.add_message(session_id, payload["message"], "user")

    except WebSocketDisconnect:
        chat_manager.user_connections.pop(session_id, None)
