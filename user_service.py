import json, time, asyncio, redis
from fastapi import FastAPI, WebSocket
from tool_registry import run_tools
from db import init_db, save, load_history
from sla import start as sla_start

r = redis.Redis(host="redis", decode_responses=True)
app = FastAPI()
clients = {}

@app.on_event("startup")
def startup():
    init_db()

@app.websocket("/ws/chat")
async def chat(ws: WebSocket):
    await ws.accept()
    chat_id = f"chat_{int(time.time()*1000)}"
    clients[chat_id] = ws

    await ws.send_text(json.dumps({"type": "init", "chat_id": chat_id}))

    for sender, msg in load_history(chat_id):
        await ws.send_text(json.dumps({"sender": sender, "message": msg}))

    while True:
        data = json.loads(await ws.receive_text())
        text = data["message"]
        save(chat_id, "user", text)

        tool_reply = run_tools(text)
        if tool_reply:
            save(chat_id, "bot", tool_reply)
            await ws.send_text(json.dumps({"sender": "bot", "message": tool_reply}))
        else:
            sla_start(chat_id)
            r.publish("user_to_agent", json.dumps({
                "chat_id": chat_id,
                "message": text,
                "status": "pending"
            }))
            await ws.send_text(json.dumps({
                "sender": "system",
                "message": "Connecting you to a human agent..."
            }))