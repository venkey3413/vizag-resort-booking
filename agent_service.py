import json, asyncio, redis
from fastapi import FastAPI, WebSocket
from sla import stop as sla_stop
from db import save

r = redis.Redis(host="redis", decode_responses=True)
app = FastAPI()
agents = []
assigned = {}

@app.websocket("/ws/agent")
async def agent(ws: WebSocket):
    await ws.accept()
    agents.append(ws)

    pubsub = r.pubsub()
    pubsub.subscribe("user_to_agent")

    async def listen():
        for msg in pubsub.listen():
            if msg["type"] == "message":
                for a in agents:
                    await a.send_text(msg["data"])

    asyncio.create_task(listen())

    try:
        while True:
            data = json.loads(await ws.receive_text())

            if data["type"] == "accept":
                assigned[data["chat_id"]] = ws
                r.publish("agent_to_user", json.dumps({
                    "chat_id": data["chat_id"],
                    "message": "Agent joined the chat",
                    "sender": "system"
                }))

            if data["type"] == "reply":
                save(data["chat_id"], "human", data["message"])
                r.publish("agent_to_user", json.dumps({
                    "chat_id": data["chat_id"],
                    "message": data["message"],
                    "sender": "human"
                }))
                sla = sla_stop(data["chat_id"])
                print("SLA seconds:", sla)

    finally:
        agents.remove(ws)