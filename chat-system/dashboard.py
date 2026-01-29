from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import redis
import asyncio
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

dashboard_app = FastAPI()

# Redis connection with fallback
try:
    redis_client = redis.Redis(host='redis', port=6379, decode_responses=True, socket_timeout=5)
    redis_client.ping()
    logger.info("✅ Connected to Redis at redis:6379")
except:
    try:
        redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True, socket_timeout=5)
        redis_client.ping()
        logger.info("✅ Connected to Redis at localhost:6379")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        redis_client = None

class SimpleChatManager:
    def __init__(self):
        self.active_connections = {}
        
    async def add_chat(self, session_id, message):
        if not redis_client:
            logger.error("Redis not available")
            return
            
        try:
            # Store in Redis
            chat_data = {
                "from": "user",
                "message": message,
                "time": datetime.now().isoformat()
            }
            redis_client.lpush(f"chat:{session_id}", json.dumps(chat_data))
            
            # Notify agents
            redis_client.publish("new_chats", session_id)
            logger.info(f"📨 User message stored for session {session_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to add chat: {e}")
        
    async def add_reply(self, session_id, message):
        if not redis_client:
            logger.error("Redis not available")
            return
            
        try:
            # Store in Redis
            reply_data = {
                "from": "agent", 
                "message": message,
                "time": datetime.now().isoformat()
            }
            redis_client.lpush(f"chat:{session_id}", json.dumps(reply_data))
            
            # Send to user via WebSocket if connected
            if session_id in self.active_connections:
                try:
                    await self.active_connections[session_id].send_text(
                        json.dumps({"message": message})
                    )
                    logger.info(f"📤 Reply sent to user {session_id}")
                except:
                    logger.warning(f"Failed to send WebSocket message to {session_id}")
            
            # Also publish to Redis for backup
            redis_client.publish(f"user:{session_id}", message)
            
        except Exception as e:
            logger.error(f"❌ Failed to add reply: {e}")
        
    def get_messages(self, session_id):
        if not redis_client:
            return []
            
        try:
            messages = redis_client.lrange(f"chat:{session_id}", 0, -1)
            return [json.loads(msg) for msg in reversed(messages)]
        except Exception as e:
            logger.error(f"❌ Failed to get messages: {e}")
            return []
        
    def get_all_chats(self):
        if not redis_client:
            return {}
            
        try:
            keys = redis_client.keys("chat:*")
            chats = {}
            for key in keys:
                session_id = key.replace("chat:", "")
                messages = self.get_messages(session_id)
                if messages:
                    chats[session_id] = {"messages": messages}
            return chats
        except Exception as e:
            logger.error(f"❌ Failed to get all chats: {e}")
            return {}

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
.status { padding: 10px; background: #f0f0f0; font-size: 12px; }
</style>
</head>
<body>
<div class="sidebar">
  <h3>Human Agent Dashboard</h3>
  <div class="status" id="status">Connecting...</div>
  <div id="chatList">Loading chats...</div>
</div>
<div class="chat">
  <div id="messages" class="messages">Select a chat to start</div>
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
      list.innerHTML = '<div style="padding:10px;color:#666;">No active chats</div>';
      document.getElementById('status').textContent = 'No chats - Waiting for users...';
      return;
    }
    
    list.innerHTML = '';
    Object.keys(chats).forEach(id => {
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.textContent = `User ${id.slice(-6)}`;
      div.onclick = () => openChat(id);
      if (id === currentSession) div.classList.add('active');
      list.appendChild(div);
    });
    
    document.getElementById('status').textContent = `${Object.keys(chats).length} active chats`;
  } catch (e) {
    console.error('Load error:', e);
    document.getElementById('status').textContent = 'Connection error';
  }
}

async function openChat(id) {
  currentSession = id;
  
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.classList.add('active');
  
  try {
    const res = await fetch(`/dashboard/api/chats/${id}`);
    const data = await res.json();
    const box = document.getElementById('messages');
    
    box.innerHTML = '';
    data.messages.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg ' + m.from;
      div.innerHTML = `<strong>${m.from}:</strong> ${m.message}<br><small>${new Date(m.time).toLocaleTimeString()}</small>`;
      box.appendChild(div);
    });
    
    box.scrollTop = box.scrollHeight;
    
    document.getElementById('reply').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('reply').focus();
  } catch (e) {
    console.error('Open chat error:', e);
  }
}

async function sendReply() {
  const text = document.getElementById('reply').value.trim();
  if (!text || !currentSession) return;
  
  try {
    await fetch('/dashboard/api/reply', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({session_id: currentSession, message: text})
    });
    
    const box = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'msg agent';
    div.innerHTML = `<strong>agent:</strong> ${text}<br><small>${new Date().toLocaleTimeString()}</small>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    
    document.getElementById('reply').value = '';
  } catch (e) {
    console.error('Send reply error:', e);
  }
}

// Enter key to send
document.getElementById('reply').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendReply();
});

// Auto refresh every 3 seconds
setInterval(loadChats, 3000);
loadChats();
</script>
</body>
</html>
""")

@dashboard_app.get("/api/chats")
async def get_chats():
    try:
        return chat_manager.get_all_chats()
    except Exception as e:
        logger.error(f"❌ Get chats error: {e}")
        return {}

@dashboard_app.get("/api/chats/{session_id}")
async def get_chat(session_id: str):
    try:
        messages = chat_manager.get_messages(session_id)
        return {"messages": messages}
    except Exception as e:
        logger.error(f"❌ Get chat error: {e}")
        return {"messages": []}

@dashboard_app.post("/api/reply")
async def reply(data: dict):
    try:
        session_id = data.get("session_id")
        message = data.get("message")
        if session_id and message:
            await chat_manager.add_reply(session_id, message)
            logger.info(f"📤 Agent replied to {session_id}: {message}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Reply error: {e}")
        return {"status": "error"}

@dashboard_app.websocket("/ws/user/{session_id}")
async def user_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"🔌 WebSocket connected for session {session_id}")
    
    # Store connection
    chat_manager.active_connections[session_id] = websocket
    
    try:
        while True:
            # Wait for user messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                payload = json.loads(data)
                user_message = payload.get("message", "")
                if user_message:
                    await chat_manager.add_chat(session_id, user_message)
                    logger.info(f"📨 Received from user {session_id}: {user_message}")
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.ping()
            except Exception as e:
                logger.error(f"❌ WebSocket receive error: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
    finally:
        # Clean up connection
        if session_id in chat_manager.active_connections:
            del chat_manager.active_connections[session_id]