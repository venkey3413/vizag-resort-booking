from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json
import os

class ChatManager:
    def __init__(self):
        self.pending = {}
        self.agents = {}
        self.users = {}  # Add user connections

    async def add_chat(self, session_id, message):
        self.pending[session_id] = {'message': message, 'timestamp': json.dumps({'session': session_id, 'msg': message})}
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
            await self.users[session_id].send_text(json.dumps({
                "message": message
            }))

chat_manager = ChatManager()
dashboard_app = FastAPI()

# Mount static files
dashboard_app.mount("/static", StaticFiles(directory="static"), name="static")

@dashboard_app.get("/")
async def dashboard():
    with open("static/dashboard.html", "r") as f:
        return HTMLResponse(f.read())

@dashboard_app.websocket("/ws/agent")
async def agent_ws(ws: WebSocket):
    await ws.accept()
    agent_id = id(ws)
    chat_manager.agents[agent_id] = ws
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get('type') == 'reply':
                await chat_manager.send_to_user(msg['session'], msg['message'])
    except WebSocketDisconnect:
        del chat_manager.agents[agent_id]

@dashboard_app.websocket("/ws/user/{session_id}")
async def user_ws(ws: WebSocket, session_id: str):
    await ws.accept()
    chat_manager.users[session_id] = ws
    try:
        while True:
            await ws.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        if session_id in chat_manager.users:
            del chat_manager.users[session_id]
