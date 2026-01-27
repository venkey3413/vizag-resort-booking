from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import json
import asyncio
import requests
from datetime import datetime

class ChatManager:
    def __init__(self):
        self.active_chats = {}
        self.agents = {}
        self.pending_chats = []
        self.user_connections = {}
        self.db_api_url = "http://centralized-db-api:3003/api"

    async def add_chat(self, session_id: str, message: str):
        # Store in database
        try:
            requests.post(f"{self.db_api_url}/chat-sessions", json={
                "session_id": session_id,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            })
            requests.post(f"{self.db_api_url}/chat-messages", json={
                "session_id": session_id,
                "message": message,
                "sender_type": "user",
                "timestamp": datetime.now().isoformat()
            })
        except:
            pass
            
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
        # Update database
        try:
            requests.put(f"{self.db_api_url}/chat-sessions/{session_id}", json={
                "status": "active",
                "agent_id": agent_id
            })
        except:
            pass
            
        if session_id in self.active_chats:
            self.active_chats[session_id]["agent_id"] = agent_id
            self.active_chats[session_id]["status"] = "active"
            if session_id in self.pending_chats:
                self.pending_chats.remove(session_id)

    async def add_message(self, session_id: str, message: str, sender_type: str):
        # Store in database
        try:
            requests.post(f"{self.db_api_url}/chat-messages", json={
                "session_id": session_id,
                "message": message,
                "sender_type": sender_type,
                "timestamp": datetime.now().isoformat()
            })
        except:
            pass
            
        if session_id in self.active_chats:
            self.active_chats[session_id]["messages"].append({
                "type": sender_type,
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
            
            # Send message to user's chat widget if it's from agent
            if sender_type == "agent" and session_id in self.user_connections:
                try:
                    await self.user_connections[session_id].send_text(json.dumps({
                        "type": "agent_message",
                        "message": message
                    }))
                except:
                    pass

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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #2d3748;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        .container { 
            display: flex;
            gap: 24px;
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .sidebar { 
            width: 350px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .sidebar-section {
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .sidebar-section:last-child {
            border-bottom: none;
        }
        .sidebar-section h3 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #4a5568;
        }
        .chat-area { 
            flex: 1;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .chat-item { 
            padding: 16px;
            border-bottom: 1px solid #f1f5f9;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 8px;
            margin-bottom: 8px;
        }
        .chat-item:hover { 
            background: #f8fafc;
            transform: translateX(4px);
        }
        .chat-item.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .chat-item-id {
            font-size: 12px;
            font-weight: 600;
            opacity: 0.8;
            margin-bottom: 4px;
        }
        .chat-item-preview {
            font-size: 14px;
            opacity: 0.9;
        }
        .chat-header-area {
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        .chat-header-area h2 {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
        }
        .messages { 
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #fafbfc;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .messages::-webkit-scrollbar {
            width: 6px;
        }
        .messages::-webkit-scrollbar-track {
            background: transparent;
        }
        .messages::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 3px;
        }
        .message { 
            padding: 12px 16px;
            border-radius: 16px;
            max-width: 80%;
            font-size: 14px;
            line-height: 1.4;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .user { 
            background: white;
            border: 1px solid #e2e8f0;
            align-self: flex-start;
            border-bottom-left-radius: 6px;
        }
        .agent { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 6px;
        }
        .input-area { 
            display: flex;
            gap: 12px;
            padding: 20px;
            background: white;
            border-top: 1px solid #e2e8f0;
        }
        input { 
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            outline: none;
            font-size: 14px;
            font-family: inherit;
            background: #f7fafc;
            transition: all 0.2s ease;
        }
        input:focus {
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button { 
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .badge {
            background: #667eea;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #a0aec0;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏨 Resort Chat Management Dashboard</h1>
    </div>
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-section">
                <h3>Pending Chats <span class="badge" id="pending-count">0</span></h3>
                <div id="pending-chats"></div>
            </div>
            <div class="sidebar-section">
                <h3>Active Chats</h3>
                <div id="active-chats"></div>
            </div>
        </div>
        <div class="chat-area">
            <div class="chat-header-area">
                <h2 id="chat-header">💬 Select a chat to start</h2>
            </div>
            <div id="messages" class="messages">
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                    <div>Select a chat from the sidebar to begin</div>
                </div>
            </div>
            <div class="input-area">
                <input type="text" id="message-input" placeholder="Type your response to the customer...">
                <button onclick="sendMessage()">Send Message</button>
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
                            <div class="chat-item-id">${chat.session_id}</div>
                            <div class="chat-item-preview">${(chat.latest_message?.message || chat.messages?.[0]?.message || 'New chat').substring(0, 60)}...</div>
                        </div>`
                    ).join('') || '<div style="color: #a0aec0; font-size: 14px; padding: 16px;">No pending chats</div>';
                    
                    activeDiv.innerHTML = data.active.map(chat => 
                        `<div class="chat-item" onclick="selectChat('${chat.session_id}')">
                            <div class="chat-item-id">${chat.session_id}</div>
                            <div class="chat-item-preview">Agent: ${chat.agent_id || 'Assigned'}</div>
                        </div>`
                    ).join('') || '<div style="color: #a0aec0; font-size: 14px; padding: 16px;">No active chats</div>';
                });
        }

        function selectChat(sessionId) {
            currentChatId = sessionId;
            fetch(`/api/chat/${sessionId}`)
                .then(r => r.json())
                .then(chat => {
                    document.getElementById('chat-header').innerHTML = `💬 Chat: <code>${sessionId}</code>`;
                    const messagesDiv = document.getElementById('messages');
                    if (chat.messages && chat.messages.length > 0) {
                        messagesDiv.innerHTML = chat.messages.map(msg => 
                            `<div class="message ${msg.type}">${msg.message}</div>`
                        ).join('');
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    } else {
                        messagesDiv.innerHTML = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 16px;">💬</div><div>No messages yet</div></div>';
                    }
                    
                    // Highlight selected chat
                    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
                    event.target.closest('.chat-item').classList.add('active');
                    
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

@dashboard_app.websocket("/ws/user/{session_id}")
async def user_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    chat_manager.user_connections[session_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            # Handle user messages if needed
            await chat_manager.add_message(session_id, message_data.get("message", ""), "user")
    except WebSocketDisconnect:
        if session_id in chat_manager.user_connections:
            del chat_manager.user_connections[session_id]

@dashboard_app.get("/api/chats")
async def get_chats():
    try:
        # Get from database
        sessions_response = requests.get(f"{chat_manager.db_api_url}/chat-sessions")
        if sessions_response.status_code == 200:
            sessions = sessions_response.json()
            pending = [s for s in sessions if s.get("status") == "pending"]
            active = [s for s in sessions if s.get("status") == "active"]
            
            # Add recent message preview
            for session in pending + active:
                try:
                    msg_response = requests.get(f"{chat_manager.db_api_url}/chat-messages/{session['session_id']}/latest")
                    if msg_response.status_code == 200:
                        session["latest_message"] = msg_response.json()
                except:
                    pass
                    
            return {"pending": pending, "active": active}
    except:
        pass
        
    # Fallback to memory
    pending = [chat_manager.active_chats[sid] for sid in chat_manager.pending_chats]
    active = [chat for chat in chat_manager.active_chats.values() if chat["status"] == "active"]
    return {"pending": pending, "active": active}

@dashboard_app.get("/api/chat/{session_id}")
async def get_chat(session_id: str):
    try:
        # Get from database
        messages_response = requests.get(f"{chat_manager.db_api_url}/chat-messages/{session_id}")
        session_response = requests.get(f"{chat_manager.db_api_url}/chat-sessions/{session_id}")
        
        if messages_response.status_code == 200 and session_response.status_code == 200:
            messages = messages_response.json()
            session = session_response.json()
            session["messages"] = [{"type": m["sender_type"], "message": m["message"], "timestamp": m["timestamp"]} for m in messages]
            return session
    except:
        pass
        
    # Fallback to memory
    return chat_manager.active_chats.get(session_id, {})

@dashboard_app.post("/api/assign/{session_id}")
async def assign_chat(session_id: str):
    await chat_manager.assign_agent(session_id, "agent_1")
    return {"status": "assigned"}

class MessageRequest(BaseModel):
    message: str

@dashboard_app.post("/api/send/{session_id}")
async def send_message(session_id: str, data: MessageRequest):
    await chat_manager.add_message(session_id, data.message, "agent")
    return {"status": "sent"}