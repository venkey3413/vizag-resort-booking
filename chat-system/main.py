from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

from conversation_state import get_state, update_state, clear_state
from mcp_server.server import (
    get_refund_policy,
    get_checkin_checkout_policy,
    get_resort_rules,
    check_resort_availability,
)

app = FastAPI()

class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    session_id = req.session_id
    msg = req.message.strip()
    text = msg.lower()

    state = get_state(session_id)

    # ------------------------------------------------
    # 1️⃣ START RESORT AVAILABILITY FLOW
    # ------------------------------------------------
    if "resort availability" in text or text == "availability":
        update_state(session_id, {
            "intent": "availability"
        })
        return {
            "answer": "📅 Please provide your check-in date (YYYY-MM-DD)",
            "handover": False
        }

    # ------------------------------------------------
    # 2️⃣ CHECK-IN DATE
    # ------------------------------------------------
    if state.get("intent") == "availability" and "check_in" not in state:
        try:
            datetime.strptime(msg, "%Y-%m-%d")
            update_state(session_id, {"check_in": msg})
            return {
                "answer": "📅 Please provide your check-out date (YYYY-MM-DD)",
                "handover": False
            }
        except ValueError:
            return {
                "answer": "❌ Invalid date. Please use YYYY-MM-DD",
                "handover": False
            }

    # ------------------------------------------------
    # 3️⃣ CHECK-OUT DATE
    # ------------------------------------------------
    if "check_in" in state and "check_out" not in state:
        try:
            datetime.strptime(msg, "%Y-%m-%d")
            update_state(session_id, {"check_out": msg})
            return {
                "answer": "🏨 Please enter the resort name",
                "handover": False
            }
        except ValueError:
            return {
                "answer": "❌ Invalid date. Please use YYYY-MM-DD",
                "handover": False
            }

    # ------------------------------------------------
    # 4️⃣ RESORT NAME → DB CHECK
    # ------------------------------------------------
    if "check_out" in state and "resort_name" not in state:
        update_state(session_id, {"resort_name": msg})

        result = check_resort_availability(
            resort_name=msg,
            check_in=state["check_in"],
            check_out=state["check_out"]
        )

        clear_state(session_id)

        return {
            "answer": result,
            "handover": False
        }

    # ------------------------------------------------
    # 5️⃣ STATIC POLICY TOOLS
    # ------------------------------------------------
    if "refund" in text:
        return {"answer": get_refund_policy(), "handover": False}

    if "checkin" in text or "checkout" in text:
        return {"answer": get_checkin_checkout_policy(), "handover": False}

    if "rules" in text:
        return {"answer": get_resort_rules(), "handover": False}

    # ------------------------------------------------
    # 6️⃣ SAFE FALLBACK (NO HUMAN AUTO-HANDOVER)
    # ------------------------------------------------
    return {
        "answer": (
            "❓ I didn’t understand that.\n\n"
            "You can ask about:\n"
            "• Refund policy\n"
            "• Check-in / Check-out\n"
            "• Resort rules\n"
            "• Resort availability"
        ),
        "handover": False
    }
