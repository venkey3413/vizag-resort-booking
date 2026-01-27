from fastapi import FastAPI
from pydantic import BaseModel
import re

from conversation_state import get_state, update_state, clear_state
from mcp_server.server import (
    get_refund_policy,
    get_checkin_checkout_policy,
    get_resort_rules,
    check_resort_availability,
)

# ✅ IMPORT DASHBOARD APP
from dashboard import dashboard_app, chat_manager

# ✅ MAIN APP
app = FastAPI(title="Vizag Resort Booking Chat API")

# ✅ MOUNT HUMAN AGENT DASHBOARD
app.mount("/dashboard", dashboard_app)
app.mount("/agent", dashboard_app)   # optional alias

class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/api/chat")
async def chat(req: ChatRequest):
    msg = req.message.strip()
    text = msg.lower()
    session_id = req.session_id
    state = get_state(session_id)

    # -----------------------------
    # 1️⃣ Resort availability flow
    # -----------------------------
    if "availability" in text:
        update_state(session_id, {"intent": "availability"})
        return {
            "answer": "📅 Please provide your check-in date (YYYY-MM-DD)",
            "handover": False
        }

    if state.get("intent") == "availability" and "check_in" not in state:
        if re.match(r"\d{4}-\d{2}-\d{2}", msg):
            update_state(session_id, {"check_in": msg})
            return {
                "answer": "📅 Please provide your check-out date (YYYY-MM-DD)",
                "handover": False
            }
        return {"answer": "❗ Please enter a valid check-in date.", "handover": False}

    if "check_in" in state and "check_out" not in state:
        if re.match(r"\d{4}-\d{2}-\d{2}", msg):
            update_state(session_id, {"check_out": msg})
            return {
                "answer": "🏨 Please enter the resort name",
                "handover": False
            }
        return {"answer": "❗ Please enter a valid check-out date.", "handover": False}

    if "check_out" in state and "resort_name" not in state:
        update_state(session_id, {"resort_name": msg})

        result = check_resort_availability(
            msg,
            state["check_in"],
            state["check_out"]
        )

        clear_state(session_id)
        return {"answer": result, "handover": False}

    # -----------------------------
    # 2️⃣ Static policies
    # -----------------------------
    if "refund" in text:
        return {"answer": get_refund_policy(), "handover": False}

    if "checkin" in text or "checkout" in text:
        return {"answer": get_checkin_checkout_policy(), "handover": False}

    if "rules" in text:
        return {"answer": get_resort_rules(), "handover": False}

    # -----------------------------
    # 3️⃣ Human fallback (FINAL)
    # -----------------------------
    await chat_manager.add_chat(session_id, msg)

    return {
        "answer": "👩💼 Connecting you to a human support agent...",
        "handover": True
    }