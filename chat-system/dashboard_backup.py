from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import json
import os

class ChatManager:
    def __init__(self):
        self.pending = {}
        self.agents = {}
        self.users = {}  # Add user connections

    async def add_chat(self, session_id, message):
        self.pending[session_id] = {
            'message': message, 
            'timestamp': json.dumps({'session': session_id, 'msg': message}),
            'session_id': session_id
        }
        await self.notify_agents()

    async def notify_agents(self):
        for ws in self.agents.values():
            await ws.send_text(json.dumps({
                "type": "new_chat",
                "count": len(self.pending),
                "chats": list(self.pending.values())
            }))
    
    async def send_to_user(self, session_id, message):
        if session_id in self.users:
            try:
                await self.users[session_id].send_text(json.dumps({
                    "message": message
                }))
                print(f"✅ Sent message to user {session_id}: {message}")
            except Exception as e:
                print(f"❌ Failed to send message to user {session_id}: {e}")
                # Remove disconnected user
                if session_id in self.users:
                    del self.users[session_id]
        else:
            print(f"⚠️ User {session_id} not connected")

chat_manager = ChatManager()
dashboard_app = FastAPI()

# Mount static files
dashboard_app.mount("/static", StaticFiles(directory="static"), name="static")

@dashboard_app.get("/")
@dashboard_app.get("")
async def dashboard():
    import os
    file_path = os.path.join(os.path.dirname(__file__), "static", "dashboard.html")
    return FileResponse(file_path)

@dashboard_app.websocket("/ws/agent")
async def agent_ws(ws: WebSocket):
    await ws.accept()
    agent_id = id(ws)
    chat_manager.agents[agent_id] = ws
    print(f"✅ Agent {agent_id} connected")
    
    # Send current pending chats to new agent
    if chat_manager.pending:
        await ws.send_text(json.dumps({
            "type": "new_chat",
            "count": len(chat_manager.pending),
            "chats": list(chat_manager.pending.values())
        }))
    
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            print(f"Agent message received: {msg}")
            
            if msg.get('type') == 'reply':
                session_id = msg.get('session')
                message = msg.get('message')
                print(f"Sending reply to session {session_id}: {message}")
                await chat_manager.send_to_user(session_id, message)
    except WebSocketDisconnect:
        print(f"❌ Agent {agent_id} disconnected")
        if agent_id in chat_manager.agents:
            del chat_manager.agents[agent_id]

@dashboard_app.websocket("/ws/user/{session_id}")
async def user_ws(ws: WebSocket, session_id: str):
    await ws.accept()
    chat_manager.users[session_id] = ws
    print(f"✅ User {session_id} connected to human chat")
    
    try:
        while True:
            # Keep connection alive and handle any user messages
            data = await ws.receive_text()
            print(f"User {session_id} sent: {data}")
    except WebSocketDisconnect:
        print(f"❌ User {session_id} disconnected from human chat")
        if session_id in chat_manager.users:
            del chat_manager.users[session_id]
