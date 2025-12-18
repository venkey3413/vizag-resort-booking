from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import json
import asyncio
from datetime import datetime

class ChatManager:
    def __init__(self):
        self.active_chats = {}
        self.agents = {}
        self.pending_chats = []

    async def add_chat(self, session_id: str, message: str):
        chat = {
            "session_id": session_id,
            "messages": [{"type": "user", "message": message, "timestamp": datetime.now().isoformat()}],
            "status": "pending",
            "agent_id": None
        }
        self.active_chats[session_id] = chat
        self.pending_chats.append(session_id)
        await self.notify_agents()

    async def assign_agent(self, session_id: str, agent_id: str):
        if session_id in self.active_chats:
            self.active_chats[session_id]["agent_id"] = agent_id
            self.active_chats[session_id]["status"] = "active"
            if session_id in self.pending_chats:
                self.pending_chats.remove(session_id)

    async def add_message(self, session_id: str, message: str, sender_type: str):
        if session_id in self.active_chats:
            self.active_chats[session_id]["messages"].append({
                "type": sender_type,
                "message": message,
                "timestamp": datetime.now().isoformat()
            })

    async def notify_agents(self):
        for agent_ws in self.agents.values():
            try:
                await agent_ws.send_text(json.dumps({
                    "type": "update",
                    "pending_count": len(self.pending_chats),
                    "active_chats": len(self.active_chats)
                }))
            except:
                pass

chat_manager = ChatManager()

dashboard_app = FastAPI()
dashboard_app.mount("/static", StaticFiles(directory="static"), name="static")

@dashboard_app.get("/")
async def dashboard():
    return HTMLResponse("""
<!DOCTYPE html>
<html>
<head>
    <title>Chat Management Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { display: flex; gap: 20px; }
        .sidebar { width: 300px; border: 1px solid #ddd; padding: 15px; }
        .chat-area { flex: 1; border: 1px solid #ddd; padding: 15px; }
        .chat-item { padding: 10px; border: 1px solid #eee; margin: 5px 0; cursor: pointer; }
        .chat-item:hover { background: #f5f5f5; }
        .messages { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
        .message { margin: 5px 0; padding: 5px; }
        .user { background: #e3f2fd; }
        .agent { background: #f3e5f5; }
        .input-area { display: flex; gap: 10px; }
        input { flex: 1; padding: 8px; }
        button { padding: 8px 15px; }
    </style>
</head>
<body>
    <h1>Resort Chat Management Dashboard</h1>
    <div class="container">
        <div class="sidebar">
            <h3>Pending Chats (<span id="pending-count">0</span>)</h3>
            <div id="pending-chats"></div>
            <h3>Active Chats</h3>
            <div id="active-chats"></div>
        </div>
        <div class="chat-area">
            <div id="chat-header">Select a chat to start</div>
            <div id="messages" class="messages"></div>
            <div class="input-area">
                <input type="text" id="message-input" placeholder="Type your response...">
                <button onclick="sendMessage()">Send</button>
            </div>
        </div>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:8001/ws/agent');
        let currentChatId = null;

        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'update') {
                document.getElementById('pending-count').textContent = data.pending_count;
                loadChats();
            }
        };

        function loadChats() {
            fetch('/api/chats')
                .then(r => r.json())
                .then(data => {
                    const pendingDiv = document.getElementById('pending-chats');
                    const activeDiv = document.getElementById('active-chats');
                    
                    pendingDiv.innerHTML = data.pending.map(chat => 
                        `<div class="chat-item" onclick="selectChat('${chat.session_id}')">
                            ${chat.session_id} - ${chat.messages[0].message.substring(0, 50)}...
                        </div>`
                    ).join('');
                    
                    activeDiv.innerHTML = data.active.map(chat => 
                        `<div class="chat-item" onclick="selectChat('${chat.session_id}')">
                            ${chat.session_id} - Agent: ${chat.agent_id}
                        </div>`
                    ).join('');
                });
        }

        function selectChat(sessionId) {
            currentChatId = sessionId;
            fetch(`/api/chat/${sessionId}`)
                .then(r => r.json())
                .then(chat => {
                    document.getElementById('chat-header').textContent = `Chat: ${sessionId}`;
                    const messagesDiv = document.getElementById('messages');
                    messagesDiv.innerHTML = chat.messages.map(msg => 
                        `<div class="message ${msg.type}">${msg.type}: ${msg.message}</div>`
                    ).join('');
                    
                    if (chat.status === 'pending') {
                        fetch(`/api/assign/${sessionId}`, {method: 'POST'});
                    }
                });
        }

        function sendMessage() {
            const input = document.getElementById('message-input');
            if (currentChatId && input.value.trim()) {
                fetch(`/api/send/${currentChatId}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({message: input.value})
                });
                input.value = '';
                selectChat(currentChatId);
            }
        }

        loadChats();
        setInterval(loadChats, 5000);
    </script>
</body>
</html>
    """)

@dashboard_app.websocket("/ws/agent")
async def agent_websocket(websocket: WebSocket):
    await websocket.accept()
    agent_id = f"agent_{len(chat_manager.agents)}"
    chat_manager.agents[agent_id] = websocket
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        del chat_manager.agents[agent_id]

@dashboard_app.get("/api/chats")
async def get_chats():
    pending = [chat_manager.active_chats[sid] for sid in chat_manager.pending_chats]
    active = [chat for chat in chat_manager.active_chats.values() if chat["status"] == "active"]
    return {"pending": pending, "active": active}

@dashboard_app.get("/api/chat/{session_id}")
async def get_chat(session_id: str):
    return chat_manager.active_chats.get(session_id, {})

@dashboard_app.post("/api/assign/{session_id}")
async def assign_chat(session_id: str):
    await chat_manager.assign_agent(session_id, "agent_1")
    return {"status": "assigned"}

@dashboard_app.post("/api/send/{session_id}")
async def send_message(session_id: str, data: dict):
    await chat_manager.add_message(session_id, data["message"], "agent")
    return {"status": "sent"}