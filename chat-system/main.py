import json
import redis
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

redis_pub = redis.Redis(decode_responses=True)
redis_sub = redis.Redis(decode_responses=True)

USER_TO_AGENT = "user_to_agent"
AGENT_TO_USER = "agent_to_user"

connections = {}  # chat_id → WebSocket

@app.on_event("startup")
async def startup():
    asyncio.create_task(redis_listener())

async def redis_listener():
    pubsub = redis_sub.pubsub()
    pubsub.subscribe(AGENT_TO_USER)

    while True:
        message = pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            data = json.loads(message["data"])
            chat_id = data["chat_id"]

            if chat_id in connections:
                await connections[chat_id].send_text(json.dumps({
                    "sender": "human",
                    "message": data["message"]
                }))
        await asyncio.sleep(0.01)

@app.websocket("/ws/chat")
async def chat_ws(ws: WebSocket):
    await ws.accept()
    chat_id = str(id(ws))
    connections[chat_id] = ws

    try:
        while True:
            data = json.loads(await ws.receive_text())

            if data["type"] == "connect_human":
                redis_pub.publish(USER_TO_AGENT, json.dumps({
                    "chat_id": chat_id,
                    "message": data["message"]
                }))

            else:
                await ws.send_text(json.dumps({
                    "sender": "bot",
                    "message": "Please click Connect to Human for live support."
                }))

    except WebSocketDisconnect:
        connections.pop(chat_id, None)