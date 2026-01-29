from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import redis
import asyncio
from datetime import datetime

dashboard_app = FastAPI()

# Redis connection
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

class SimpleChatManager:
    async def add_chat(self, session_id, message):
        # Store in Redis
        chat_data = {
            "from": "user",
            "message": message,
            "time": datetime.now().isoformat()
        }
        redis_client.lpush(f"chat:{session_id}", json.dumps(chat_data))
        
        # Notify agents
        redis_client.publish("new_chats", session_id)
        
    async def add_reply(self, session_id, message):
        # Store in Redis
        reply_data = {
            "from": "agent", 
            "message": message,
            "time": datetime.now().isoformat()
        }
        redis_client.lpush(f"chat:{session_id}", json.dumps(reply_data))
        
        # Send to user
        redis_client.publish(f"user:{session_id}", message)
        
    def get_messages(self, session_id):
        messages = redis_client.lrange(f"chat:{session_id}", 0, -1)
        return [json.loads(msg) for msg in reversed(messages)]
        
    def get_all_chats(self):
        keys = redis_client.keys("chat:*")
        chats = {}
        for key in keys:
            session_id = key.replace("chat:", "")
            messages = self.get_messages(session_id)
            if messages:
                chats[session_id] = {"messages": messages}
        return chats

chat_manager = SimpleChatManager()

@dashboard_app.get("/")
async def dashboard():
    return HTMLResponse("""
<!DOCTYPE html>
<html>
<head>
<title>Agent Dashboard</title>
<style>
body { font-family: Arial; display: flex; height: 100vh; margin: 0; }
.sidebar { width: 300px; border-right: 1px solid #ddd; padding: 10px; }
.chat { flex: 1; display: flex; flex-direction: column; }
.messages { flex: 1; padding: 10px; overflow-y: auto; background: #f9f9f9; }
.msg { margin: 5px 0; padding: 8px; border-radius: 8px; }
.user { background: #e3f2fd; }
.agent { background: #c8e6c9; }
input { width: 100%; padding: 10px; }
button { padding: 10px; background: #4caf50; color: white; border: none; }
.chat-item { cursor: pointer; padding: 8px; border-bottom: 1px solid #eee; }
.chat-item:hover { background: #f5f5f5; }
.chat-item.active { background: #2196f3; color: white; }
</style>
</head>
<body>
<div class="sidebar">
  <h3>Chats</h3>
  <div id="chatList">No chats</div>
</div>
<div class="chat">
  <div id="messages" class="messages">Select a chat</div>
  <div style="display: flex; padding: 10px;">
    <input id="reply" placeholder="Type reply..." disabled />
    <button onclick="sendReply()" id="sendBtn" disabled>Send</button>
  </div>
</div>

<script>
let currentSession = null;

async function loadChats() {
  try {
    const res = await fetch('/dashboard/api/chats');
    const chats = await res.json();
    const list = document.getElementById('chatList');
    
    if (Object.keys(chats).length === 0) {
      list.innerHTML = 'No chats';
      return;
    }
    
    list.innerHTML = '';
    Object.keys(chats).forEach(id => {
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.textContent = `User ${id.slice(-6)}`;
      div.onclick = () => openChat(id);
      list.appendChild(div);
    });
  } catch (e) {
    console.error('Load error:', e);
  }
}

async function openChat(id) {
  currentSession = id;
  
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.classList.add('active');
  
  const res = await fetch(`/dashboard/api/chats/${id}`);
  const data = await res.json();
  const box = document.getElementById('messages');
  
  box.innerHTML = '';
  data.messages.forEach(m => {
    const div = document.createElement('div');
    div.className = 'msg ' + m.from;
    div.textContent = m.from + ': ' + m.message;
    box.appendChild(div);
  });
  
  document.getElementById('reply').disabled = false;
  document.getElementById('sendBtn').disabled = false;
}

async function sendReply() {
  const text = document.getElementById('reply').value.trim();
  if (!text || !currentSession) return;
  
  await fetch('/dashboard/api/reply', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({session_id: currentSession, message: text})
  });
  
  const box = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg agent';
  div.textContent = 'agent: ' + text;
  box.appendChild(div);
  
  document.getElementById('reply').value = '';
}

// Auto refresh
setInterval(loadChats, 2000);
loadChats();
</script>
</body>
</html>
""")

@dashboard_app.get("/api/chats")
async def get_chats():
    try:
        return chat_manager.get_all_chats()
    except:
        return {}

@dashboard_app.get("/api/chats/{session_id}")
async def get_chat(session_id: str):
    try:
        messages = chat_manager.get_messages(session_id)
        return {"messages": messages}
    except:
        return {"messages": []}

@dashboard_app.post("/api/reply")
async def reply(data: dict):
    try:
        session_id = data.get("session_id")
        message = data.get("message")
        if session_id and message:
            await chat_manager.add_reply(session_id, message)
        return {"status": "ok"}
    except:
        return {"status": "error"}

@dashboard_app.websocket("/ws/user/{session_id}")
async def user_ws(ws: WebSocket, session_id: str):
    await ws.accept()
    
    # Subscribe to user messages
    pubsub = redis_client.pubsub()
    pubsub.subscribe(f"user:{session_id}")
    
    try:
        while True:
            # Check for agent replies
            message = pubsub.get_message(timeout=0.1)
            if message and message['type'] == 'message':
                await ws.send_text(json.dumps({"message": message['data']}))
            
            # Check for user messages
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=0.1)
                payload = json.loads(data)
                user_message = payload.get("message", "")
                if user_message:
                    await chat_manager.add_chat(session_id, user_message)
            except asyncio.TimeoutError:
                pass
                
    except WebSocketDisconnect:
        pubsub.close()