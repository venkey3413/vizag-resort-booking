import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json
import redis
from main import app

redis_client = redis.Redis(
    host="redis",
    port=6379,
    decode_responses=True
)

app.mount("/static", StaticFiles(directory="static"), name="static")

active_agents = set()

@app.get("/agent", response_class=HTMLResponse)
def agent_dashboard():
    with open("human_dashboard.html", "r") as f:
        return f.read()

@app.websocket("/ws/agent")
async def agent_socket(ws: WebSocket):
    await ws.accept()
    active_agents.add(ws)

    try:
        while True:
            data = await ws.receive_text()
            payload = json.loads(data)

            chat_id = payload["chat_id"]
            message = payload["message"]

            # Save human response
            redis_client.rpush(
                f"chat:{chat_id}:messages",
                json.dumps({
                    "sender": "human",
                    "text": message
                })
            )

    except WebSocketDisconnect:
        active_agents.remove(ws)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

