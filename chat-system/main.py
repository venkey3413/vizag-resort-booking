from fastapi import FastAPI
from pydantic import BaseModel
import re
import redis
import logging

from conversation_state import get_state, update_state, clear_state
from mcp_server.server import (
    get_refund_policy,
    get_checkin_checkout_policy,
    get_resort_rules,
    check_resort_availability,
    get_active_coupons,
)

from dashboard import dashboard_app, chat_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vizag Resort Booking Chat API")

# Mount dashboard
app.mount("/dashboard", dashboard_app)

# Redis client with fallback
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

class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/api/chat")
async def chat(req: ChatRequest):
    msg = req.message.strip()
    text = msg.lower()
    session_id = req.session_id
    state = get_state(session_id)
    
    logger.info(f"💬 Chat request from {session_id}: {msg}")

    # HUMAN HANDOVER TRIGGER
    if msg == "__HUMAN__" or "human" in text or "agent" in text:
        logger.info(f"👩💼 Human handover requested for {session_id}")
        await chat_manager.add_chat(session_id, "User requested human agent")
        return {
            "answer": "👩💼 Connecting you to a live agent...",
            "handover": True
        }

    # MCP TOOLS
    if "refund" in text:
        return {"answer": get_refund_policy(), "handover": False}

    if "check-in" in text or "checkout" in text:
        return {"answer": get_checkin_checkout_policy(), "handover": False}

    if "rules" in text:
        return {"answer": get_resort_rules(), "handover": False}
        
    if "coupon" in text or "discount" in text or "offer" in text:
        return {"answer": get_active_coupons(), "handover": False}

    # AVAILABILITY FLOW
    if "availability" in text:
        update_state(session_id, {"intent": "availability"})
        return {"answer": "📅 Enter check-in date (YYYY-MM-DD)", "handover": False}

    if state.get("intent") == "availability" and "check_in" not in state:
        if re.match(r"\d{4}-\d{2}-\d{2}", msg):
            update_state(session_id, {"check_in": msg})
            return {"answer": "📅 Enter check-out date", "handover": False}
        return {"answer": "❗ Invalid date format", "handover": False}

    if "check_in" in state and "check_out" not in state:
        if re.match(r"\d{4}-\d{2}-\d{2}", msg):
            update_state(session_id, {"check_out": msg})
            return {"answer": "🏨 Enter resort name", "handover": False}
        return {"answer": "❗ Invalid date", "handover": False}

    if "check_out" in state and "resort_name" not in state:
        update_state(session_id, {"resort_name": msg})
        result = check_resort_availability(
            msg,
            state["check_in"],
            state["check_out"]
        )
        clear_state(session_id)
        return {"answer": result, "handover": False}

    # DEFAULT: HUMAN HANDOVER FOR UNHANDLED MESSAGES
    logger.info(f"🤖 Unhandled message, triggering human handover for {session_id}")
    await chat_manager.add_chat(session_id, msg)
    
    return {
        "answer": "👩💼 Let me connect you to a human agent who can better assist you...",
        "handover": True
    }

@app.get("/health")
async def health_check():
    redis_status = "connected" if redis_client else "disconnected"
    return {
        "status": "healthy",
        "redis": redis_status,
        "chat_manager": "active"
    }