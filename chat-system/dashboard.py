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
    return HTMLResponse("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human Agent Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            color: white;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        
        .status {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 10px;
        }
        
        .status-item {
            background: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: 600;
        }
        
        .main-content {
            display: flex;
            flex: 1;
            gap: 20px;
            padding: 20px;
            overflow: hidden;
        }
        
        .chat-list {
            width: 350px;
            background: rgba(255,255,255,0.95);
            border-radius: 15px;
            padding: 20px;
            overflow-y: auto;
        }
        
        .chat-area {
            flex: 1;
            background: rgba(255,255,255,0.95);
            border-radius: 15px;
            padding: 20px;
            display: flex;
            flex-direction: column;
        }
        
        .chat-item {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .chat-item:hover {
            border-color: #667eea;
            transform: translateY(-2px);
        }
        
        .chat-item.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .chat-messages {
            flex: 1;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            overflow-y: auto;
            background: #f8f9fa;
            min-height: 400px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px 15px;
            border-radius: 10px;
            max-width: 80%;
        }
        
        .message.user {
            background: #e3f2fd;
            margin-left: auto;
            text-align: right;
        }
        
        .message.agent {
            background: #667eea;
            color: white;
        }
        
        .reply-area {
            display: flex;
            gap: 10px;
        }
        
        .reply-input {
            flex: 1;
            padding: 15px;
            border: 2px solid #e9ecef;
            border-radius: 25px;
            outline: none;
            font-size: 16px;
        }
        
        .reply-input:focus {
            border-color: #667eea;
        }
        
        .send-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        
        .send-btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
        }
        
        .no-chats {
            text-align: center;
            color: #6c757d;
            padding: 40px;
        }
        
        .no-chat-selected {
            text-align: center;
            color: #6c757d;
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>👩💼 Human Agent Dashboard</h1>
        <div class="status">
            <div class="status-item">
                Status: <span id="connectionStatus">Connecting...</span>
            </div>
            <div class="status-item">
                Pending Chats: <span id="chatCount">0</span>
            </div>
        </div>
    </div>
    
    <div class="main-content">
        <div class="chat-list">
            <h3 style="margin-bottom: 15px;">💬 Active Chats</h3>
            <div id="chatList">
                <div class="no-chats">No pending chats</div>
            </div>
        </div>
        
        <div class="chat-area">
            <div id="chatMessages" class="chat-messages">
                <div class="no-chat-selected">
                    <h3>👋 Welcome Agent!</h3>
                    <p>Select a chat from the left to start helping customers</p>
                </div>
            </div>
            
            <div class="reply-area">
                <input 
                    type="text" 
                    id="replyInput" 
                    class="reply-input" 
                    placeholder="Type your reply to customer..."
                    disabled
                />
                <button id="sendBtn" class="send-btn" onclick="sendReply()" disabled>
                    Send
                </button>
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let currentSession = null;
        let chatHistory = {};
        
        function connectWebSocket() {
            const wsUrl = `ws://${window.location.host}/dashboard/ws/agent`;
            console.log('Connecting to:', wsUrl);
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                document.getElementById('connectionStatus').textContent = 'Online';
                document.getElementById('connectionStatus').style.color = '#28a745';
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received:', data);
                
                if (data.type === 'new_chat') {
                    document.getElementById('chatCount').textContent = data.count;
                    updateChatList(data.chats || []);
                    
                    // Play notification sound
                    try {
                        // Only play sound after user interaction
                        if (document.hasFocus()) {
                            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
                        }
                    } catch (e) {
                        // Silently ignore audio errors
                    }
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                document.getElementById('connectionStatus').textContent = 'Disconnected';
                document.getElementById('connectionStatus').style.color = '#dc3545';
                
                // Reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                document.getElementById('connectionStatus').textContent = 'Error';
                document.getElementById('connectionStatus').style.color = '#dc3545';
            };
        }
        
        function updateChatList(chats) {
            const chatList = document.getElementById('chatList');
            
            if (chats.length === 0) {
                chatList.innerHTML = '<div class="no-chats">No pending chats</div>';
                return;
            }
            
            chatList.innerHTML = chats.map((chat, index) => {
                try {
                    const sessionData = JSON.parse(chat.timestamp);
                    return `
                        <div class="chat-item" onclick="selectChat('${sessionData.session}', '${sessionData.msg.replace(/'/g, "&apos;")}')"> 
                            <strong>User ${sessionData.session.slice(-6)}</strong>
                            <p style="margin-top: 5px; color: #6c757d; font-size: 14px;">
                                ${sessionData.msg.substring(0, 50)}${sessionData.msg.length > 50 ? '...' : ''}
                            </p>
                        </div>
                    `;
                } catch (e) {
                    console.error('Error parsing chat data:', e);
                    return '';
                }
            }).join('');
        }
        
        function selectChat(sessionId, initialMessage) {
            currentSession = sessionId;
            
            // Update active chat styling
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.chat-item').classList.add('active');
            
            // Initialize chat history if not exists
            if (!chatHistory[sessionId]) {
                chatHistory[sessionId] = [
                    { type: 'user', message: initialMessage, timestamp: new Date() }
                ];
            }
            
            // Display chat messages
            displayChatMessages(sessionId);
            
            // Enable reply input
            document.getElementById('replyInput').disabled = false;
            document.getElementById('sendBtn').disabled = false;
            document.getElementById('replyInput').focus();
        }
        
        function displayChatMessages(sessionId) {
            const messagesDiv = document.getElementById('chatMessages');
            const messages = chatHistory[sessionId] || [];
            
            messagesDiv.innerHTML = messages.map(msg => `
                <div class="message ${msg.type}">
                    <strong>${msg.type === 'user' ? 'Customer' : 'You'}:</strong>
                    <p style="margin-top: 5px;">${msg.message}</p>
                    <small style="opacity: 0.7;">${msg.timestamp.toLocaleTimeString()}</small>
                </div>
            `).join('');
            
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function sendReply() {
            const input = document.getElementById('replyInput');
            const message = input.value.trim();
            
            if (!message || !currentSession || !ws) return;
            
            // Add to chat history
            if (!chatHistory[currentSession]) {
                chatHistory[currentSession] = [];
            }
            
            chatHistory[currentSession].push({
                type: 'agent',
                message: message,
                timestamp: new Date()
            });
            
            // Send via WebSocket
            ws.send(JSON.stringify({
                type: 'reply',
                session: currentSession,
                message: message
            }));
            
            console.log('Sent reply:', message, 'to session:', currentSession);
            
            // Update display
            displayChatMessages(currentSession);
            input.value = '';
        }
        
        // Send message on Enter key
        document.getElementById('replyInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendReply();
            }
        });
        
        // Connect on page load
        connectWebSocket();
    </script>
</body>
</html>
    """)

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
