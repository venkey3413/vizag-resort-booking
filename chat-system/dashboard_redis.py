from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import redis
import asyncio
from datetime import datetime

dashboard_app = FastAPI()

# Redis connection
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# -----------------------------
# CHAT MANAGER WITH REDIS
# -----------------------------
class RedisChatManager:
    def __init__(self):
        self.agent_connections = {}
        self.user_connections = {}
        
    async def add_chat(self, session_id, message):
        # Store chat in Redis
        chat_data = {
            "session_id": session_id,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "from": "user"
        }
        
        # Add to chat history
        redis_client.lpush(f"chat:{session_id}:messages", json.dumps(chat_data))
        
        # Publish to agents
        redis_client.publish("agent_notifications", json.dumps({
            "type": "new_message",
            "session_id": session_id,
            "message": message
        }))
        
    async def send_agent_reply(self, session_id, message):
        # Store reply in Redis
        reply_data = {
            "session_id": session_id,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "from": "agent"
        }
        
        # Add to chat history
        redis_client.lpush(f"chat:{session_id}:messages", json.dumps(reply_data))
        
        # Publish to user
        redis_client.publish(f"user:{session_id}", json.dumps({
            "message": message
        }))
        
    def get_chat_messages(self, session_id):
        messages = redis_client.lrange(f"chat:{session_id}:messages", 0, -1)
        return [json.loads(msg) for msg in reversed(messages)]
        
    def get_all_chats(self):
        # Get all chat sessions
        keys = redis_client.keys("chat:*:messages")
        chats = {}
        for key in keys:
            session_id = key.split(":")[1]
            messages = self.get_chat_messages(session_id)
            if messages:
                chats[session_id] = {"messages": messages}
        return chats

chat_manager = RedisChatManager()

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
.sidebar { width:300px; border-right:1px solid #ddd; padding:10px; overflow-y:auto }
.chat { flex:1; display:flex; flex-direction:column }
.chat-box { flex:1; padding:10px; overflow-y:auto; background:#f9f9f9 }
.msg { margin:5px 0; padding:8px; border-radius:8px }
.user { background:#e3f2fd; margin-left:20px }
.agent { background:#c8e6c9; margin-right:20px }
input { width:100%; padding:10px; border:1px solid #ddd }
button { padding:10px; width:100%; background:#4caf50; color:white; border:none }
.chat-item { cursor:pointer; padding:8px; border-bottom:1px solid #eee; border-radius:4px; margin:2px 0 }
.chat-item:hover { background:#f5f5f5 }
.chat-item.active { background:#2196f3; color:white }
h3 { color:#333; margin-bottom:10px }
</style>
</head>

<body>
<div class="sidebar">
  <h3>💬 Active Chats</h3>
  <div id="chatList">No chats available</div>
</div>

<div class="chat">
  <div class="chat-box" id="chatBox">
    <div style="text-align:center; color:#666; padding:50px">
      Select a chat to start helping customers
    </div>
  </div>
  <div style="display:flex; gap:10px; padding:10px; border-top:1px solid #ddd">
    <input id="reply" placeholder="Type your reply..." disabled />
    <button onclick="sendReply()" disabled id="sendBtn">Send</button>
  </div>
</div>

<script>
let currentSession = null;
let eventSource = null;

// Start listening for agent notifications
function startAgentListener() {
  eventSource = new EventSource('/dashboard/agent-stream');
  
  eventSource.onmessage = function(event) {
    console.log('Agent notification:', event.data);
    loadChats();
  };
  
  eventSource.onerror = function(event) {
    console.error('EventSource error:', event);
    setTimeout(startAgentListener, 5000); // Reconnect after 5 seconds
  };
}

async function loadChats() {
  try {
    const res = await fetch("/dashboard/api/chats");
    const chats = await res.json();
    const list = document.getElementById("chatList");
    
    if (Object.keys(chats).length === 0) {
      list.innerHTML = "No chats available";
      return;
    }
    
    list.innerHTML = "";
    Object.keys(chats).forEach(id => {
      const chat = chats[id];
      const lastMessage = chat.messages[chat.messages.length - 1];
      
      const div = document.createElement("div");
      div.className = "chat-item";
      if (id === currentSession) div.classList.add("active");
      
      div.innerHTML = `
        <strong>User ${id.slice(-6)}</strong><br>
        <small style="color:#666">${lastMessage.message.substring(0, 30)}...</small>
      `;
      div.onclick = () => openChat(id);
      list.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading chats:', error);
  }
}

async function openChat(id) {
  currentSession = id;
  
  // Update active styling
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.chat-item').classList.add('active');
  
  // Load messages
  const res = await fetch(`/dashboard/api/chats/${id}`);
  const data = await res.json();
  const box = document.getElementById("chatBox");
  
  box.innerHTML = "";
  data.messages.forEach(m => {
    const d = document.createElement("div");
    d.className = "msg " + m.from;
    d.innerHTML = `<strong>${m.from === 'user' ? 'Customer' : 'You'}:</strong><br>${m.message}`;
    box.appendChild(d);
  });
  
  box.scrollTop = box.scrollHeight;
  
  // Enable reply
  document.getElementById("reply").disabled = false;
  document.getElementById("sendBtn").disabled = false;
  document.getElementById("reply").focus();
}

async function sendReply() {
  const text = document.getElementById("reply").value.trim();
  if (!text || !currentSession) return;
  
  try {
    await fetch('/dashboard/api/reply', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        session_id: currentSession,
        message: text
      })
    });
    
    // Add to UI immediately
    const box = document.getElementById("chatBox");
    const d = document.createElement("div");
    d.className = "msg agent";
    d.innerHTML = `<strong>You:</strong><br>${text}`;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    
    document.getElementById("reply").value = "";
  } catch (error) {
    console.error('Error sending reply:', error);
  }
}

// Enter key support
document.getElementById("reply").addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendReply();
});

// Start everything
startAgentListener();
loadChats();
</script>
</body>
</html>
""")

# -----------------------------
# API ENDPOINTS
# -----------------------------
@dashboard_app.get("/api/chats")
async def get_chats():
    return chat_manager.get_all_chats()

@dashboard_app.get("/api/chats/{session_id}")
async def get_chat(session_id: str):
    messages = chat_manager.get_chat_messages(session_id)
    return {"messages": messages}

@dashboard_app.post("/api/reply")
async def send_reply(data: dict):
    session_id = data.get("session_id")
    message = data.get("message")
    
    if session_id and message:
        await chat_manager.send_agent_reply(session_id, message)
        return {"status": "sent"}
    
    return {"error": "Missing data"}

# -----------------------------
# SERVER-SENT EVENTS FOR AGENTS
# -----------------------------
@dashboard_app.get("/agent-stream")
async def agent_stream():
    async def event_generator():
        pubsub = redis_client.pubsub()
        pubsub.subscribe("agent_notifications")
        
        try:
            while True:
                message = pubsub.get_message(timeout=1)
                if message and message['type'] == 'message':
                    yield f"data: {message['data']}\n\n"
                await asyncio.sleep(0.1)
        except Exception as e:
            print(f"Agent stream error: {e}")
        finally:
            pubsub.close()
    
    return StreamingResponse(event_generator(), media_type="text/plain")

# -----------------------------
# USER WEBSOCKET (FOR RECEIVING REPLIES)
# -----------------------------
@dashboard_app.websocket("/ws/user/{session_id}")
async def user_ws(ws: WebSocket, session_id: str):
    await ws.accept()
    chat_manager.user_connections[session_id] = ws
    
    # Subscribe to user-specific channel
    pubsub = redis_client.pubsub()
    pubsub.subscribe(f"user:{session_id}")
    
    try:
        while True:
            # Check for Redis messages
            message = pubsub.get_message(timeout=0.1)
            if message and message['type'] == 'message':
                await ws.send_text(message['data'])
            
            # Check for WebSocket messages (user sending new messages)
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=0.1)
                payload = json.loads(data)
                user_message = payload.get("message", "")
                if user_message:
                    await chat_manager.add_chat(session_id, user_message)
            except asyncio.TimeoutError:
                pass
            
    except WebSocketDisconnect:
        print(f"User {session_id} disconnected")
        chat_manager.user_connections.pop(session_id, None)
        pubsub.close()

from fastapi.responses import StreamingResponse