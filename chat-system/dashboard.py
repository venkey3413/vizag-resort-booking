from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
from datetime import datetime

dashboard_app = FastAPI()

# -----------------------------
# CHAT MANAGER
# -----------------------------
class ChatManager:
    def __init__(self):
        self.pending_chats = {}
        self.active_chats = {}
        self.user_connections = {}
        self.agent_connections = {}

    async def add_chat(self, session_id, message):
        self.pending_chats[session_id] = {
            "messages": [
                {"from": "user", "text": message, "time": datetime.now().isoformat()}
            ]
        }
        # Notify all agents
        await self.notify_agents()

    async def notify_agents(self):
        for agent_ws in self.agent_connections.values():
            try:
                await agent_ws.send_text(json.dumps({"type": "new_chat"}))
            except:
                pass

    async def add_message(self, session_id, sender, message):
        chat = self.pending_chats.get(session_id) or self.active_chats.get(session_id)
        if not chat:
            return
        chat["messages"].append({
            "from": sender,
            "text": message,
            "time": datetime.now().isoformat()
        })

        # Send to user if agent replies
        if sender == "agent" and session_id in self.user_connections:
            await self.user_connections[session_id].send_text(
                json.dumps({"message": message})
            )
        
        # Notify agents of message updates
        await self.notify_agents()

chat_manager = ChatManager()

# -----------------------------
# DASHBOARD UI
# -----------------------------
@dashboard_app.get("/")
async def dashboard():
    return HTMLResponse("""
<!DOCTYPE html>
<html>
<head>
<title>Human Agent Dashboard</title>
<style>
body { font-family: Arial; display:flex; height:100vh; margin:0 }
.sidebar { width:300px; border-right:1px solid #ddd; padding:10px }
.chat { flex:1; display:flex; flex-direction:column }
.chat-box { flex:1; padding:10px; overflow:auto }
.msg { margin:5px 0 }
.user { color:blue }
.agent { color:green }
input { width:100%; padding:10px }
button { padding:10px; width:100% }
.chat-item { cursor:pointer; padding:8px; border-bottom:1px solid #eee }
.chat-item:hover { background:#f5f5f5 }
</style>
</head>

<body>
<div class="sidebar">
  <h3>Pending Chats</h3>
  <div id="chatList"></div>
</div>

<div class="chat">
  <div class="chat-box" id="chatBox">Select a chat</div>
  <input id="reply" placeholder="Type reply..." />
  <button onclick="sendReply()">Send</button>
</div>

<script>
let currentSession = null;
const agentId = "agent_1";
const socket = new WebSocket(`ws://${location.host}/dashboard/ws/agent/${agentId}`);

socket.onopen = () => {
  console.log('Agent connected');
  loadChats();
};

socket.onmessage = (e) => {
  console.log('Agent received:', e.data);
  loadChats();
};

async function loadChats() {
  const res = await fetch("/dashboard/api/chats");
  const chats = await res.json();
  const list = document.getElementById("chatList");
  list.innerHTML = "";
  Object.keys(chats).forEach(id => {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.innerText = id;
    div.onclick = () => openChat(id);
    list.appendChild(div);
  });
}

async function openChat(id) {
  currentSession = id;
  const res = await fetch(`/dashboard/api/chats/${id}`);
  const data = await res.json();
  const box = document.getElementById("chatBox");
  box.innerHTML = "";
  data.messages.forEach(m => {
    const d = document.createElement("div");
    d.className = "msg " + m.from;
    d.innerText = m.from + ": " + m.text;
    box.appendChild(d);
  });
}

function sendReply() {
  const text = document.getElementById("reply").value;
  socket.send(JSON.stringify({
    session_id: currentSession,
    message: text
  }));
  document.getElementById("reply").value = "";
}

loadChats();
</script>
</body>
</html>
""")

# -----------------------------
# API FOR DASHBOARD
# -----------------------------
@dashboard_app.get("/api/chats")
async def get_chats():
    return chat_manager.pending_chats

@dashboard_app.get("/api/chats/{session_id}")
async def get_chat(session_id: str):
    return chat_manager.pending_chats.get(session_id, {})

# -----------------------------
# USER SOCKET
# -----------------------------
@dashboard_app.websocket("/ws/user/{session_id}")
async def user_ws(ws: WebSocket, session_id: str):
    await ws.accept()
    chat_manager.user_connections[session_id] = ws
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)["message"]
            await chat_manager.add_message(session_id, "user", msg)
    except WebSocketDisconnect:
        chat_manager.user_connections.pop(session_id, None)

# -----------------------------
# AGENT SOCKET
# -----------------------------
@dashboard_app.websocket("/ws/agent/{agent_id}")
async def agent_ws(ws: WebSocket, agent_id: str):
    await ws.accept()
    chat_manager.agent_connections[agent_id] = ws
    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)
            await chat_manager.add_message(
                payload["session_id"],
                "agent",
                payload["message"]
            )
    except WebSocketDisconnect:
        chat_manager.agent_connections.pop(agent_id, None)