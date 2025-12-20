from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import re
from dashboard import chat_manager
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

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

# MCP Client setup
async def call_mcp_tool(tool_name: str, arguments: dict = None):
    """Call MCP server tool using proper client"""
    try:
        server_params = StdioServerParameters(
            command="python",
            args=["mcp_server/server_working.py"]
        )
        
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                # Call the specific tool
                result = await session.call_tool(tool_name, arguments or {})
                if result.content:
                    return result.content[0].text
                
        return None
    except Exception as e:
        print(f"MCP tool error: {e}")
        return None

async def find_and_call_tool(message: str):
    """Find appropriate MCP tool based on message content"""
    text = message.lower()
    
    # Check for booking ID pattern first
    if any(char.isdigit() for char in message) and ("booking" in text or "id" in text):
        booking_id = re.search(r'\d+', message)
        if booking_id:
            return await call_mcp_tool("get_booking_status", {"booking_id": booking_id.group()})
    
    # Map keywords to MCP tools (order matters - more specific first)
    if any(word in text for word in ["refund", "cancel", "cancellation"]):
        return await call_mcp_tool("get_refund_policy")
    
    if any(word in text for word in ["check-in", "checkout", "timing", "time"]):
        return await call_mcp_tool("get_checkin_checkout_policy")
    
    if any(word in text for word in ["resorts", "hotels", "properties", "available"]):
        return await call_mcp_tool("list_resorts")
    
    if any(word in text for word in ["terms", "conditions"]):
        return await call_mcp_tool("get_terms_conditions")
    
    if any(word in text for word in ["rules", "allowed", "music", "food", "pool"]):
        return await call_mcp_tool("get_resort_rules")
    
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
    
    # Try to find and call appropriate MCP tool
    tool_response = await find_and_call_tool(message)
    
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