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

# Call MCP server tools directly
def call_mcp_tool(tool_name: str, arguments: dict = None):
    try:
        # Create MCP request
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {}
            }
        }
        
        # Call MCP server
        process = subprocess.Popen(
            ["python", "mcp_server/server.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(json.dumps(request))
        
        if process.returncode == 0 and stdout:
            response = json.loads(stdout)
            if "result" in response:
                return response["result"]["text"]
        
        return None
    except Exception as e:
        print(f"MCP tool error: {e}")
        return None

def find_and_call_tool(message: str):
    """Find appropriate MCP tool based on message content"""
    text = message.lower()
    
    # Check for booking ID pattern
    if any(char.isdigit() for char in message) and ("booking" in text or "id" in text):
        booking_id = re.search(r'\d+', message)
        if booking_id:
            return call_mcp_tool("get_booking_status", {"booking_id": booking_id.group()})
    
    # Map keywords to MCP tools
    if any(word in text for word in ["refund", "cancel", "cancellation"]):
        return call_mcp_tool("get_refund_policy")
    
    if any(word in text for word in ["check-in", "checkout", "timing", "time"]):
        return call_mcp_tool("get_checkin_checkout_policy")
    
    if any(word in text for word in ["rules", "policy", "allowed"]):
        return call_mcp_tool("get_resort_rules")
    
    if any(word in text for word in ["resorts", "hotels", "properties"]):
        return call_mcp_tool("list_resorts")
    
    if any(word in text for word in ["terms", "conditions"]):
        return call_mcp_tool("get_terms_conditions")
    
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