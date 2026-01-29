import json
import redis
import asyncio
from fastapi import FastAPI, WebSocket

app = FastAPI()

redis_pub = redis.Redis(decode_responses=True)
redis_sub = redis.Redis(decode_responses=True)

USER_TO_AGENT = "user_to_agent"
AGENT_TO_USER = "agent_to_user"

agents = []

@app.on_event("startup")
async def startup():
    asyncio.create_task(redis_listener())

async def redis_listener():
    pubsub = redis_sub.pubsub()
    pubsub.subscribe(USER_TO_AGENT)

    while True:
        msg = pubsub.get_message(ignore_subscribe_messages=True)
        if msg:
            for agent in agents:
                await agent.send_text(msg["data"])
        await asyncio.sleep(0.01)

@app.websocket("/ws/agent")
async def agent_ws(ws: WebSocket):
    await ws.accept()
    agents.append(ws)

    try:
        while True:
            data = json.loads(await ws.receive_text())
            redis_pub.publish(AGENT_TO_USER, json.dumps({
                "chat_id": data["chat_id"],
                "message": data["message"]
            }))
    finally:
        agents.remove(ws)