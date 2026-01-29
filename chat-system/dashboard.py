from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json

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

@dashboard_app.get("/")
async def dashboard():
    return HTMLResponse("""
    <h2>Human Agent Dashboard</h2>
    <p>Status: <b id="status">Online</b></p>
    <p>Pending chats: <span id="count">0</span></p>
    
    <div id="chats"></div>
    <input id="reply" placeholder="Type reply...">
    <button onclick="sendReply()">Send</button>

    <script>
      const ws = new WebSocket("ws://" + location.host + "/dashboard/ws/agent");
      let currentSession = null;
      
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        document.getElementById("count").innerText = d.count;
        if(d.type === 'new_chat') {
          new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
        }
      };
      
      function sendReply() {
        const msg = document.getElementById('reply').value;
        if(msg && currentSession) {
          ws.send(JSON.stringify({type: 'reply', session: currentSession, message: msg}));
          document.getElementById('reply').value = '';
        }
      }
    </script>
    """)

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
