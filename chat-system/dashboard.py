from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json

class ChatManager:
    def __init__(self):
        self.pending = {}
        self.agents = {}

    async def add_chat(self, session_id, message):
        self.pending[session_id] = message
        await self.notify_agents()

    async def notify_agents(self):
        for ws in self.agents.values():
            await ws.send_text(json.dumps({
                "type": "new_chat",
                "count": len(self.pending)
            }))

chat_manager = ChatManager()
dashboard_app = FastAPI()

@dashboard_app.get("/")
async def dashboard():
    return HTMLResponse("""
    <h2>Human Agent Dashboard</h2>
    <p>Status: <b id="status">Online</b></p>
    <p>Pending chats: <span id="count">0</span></p>

    <script>
      const ws = new WebSocket("ws://" + location.host + "/dashboard/ws/agent");
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        document.getElementById("count").innerText = d.count;
        new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
      };
    </script>
    """)

@dashboard_app.websocket("/ws/agent")
async def agent_ws(ws: WebSocket):
    await ws.accept()
    agent_id = id(ws)
    chat_manager.agents[agent_id] = ws
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        del chat_manager.agents[agent_id]
