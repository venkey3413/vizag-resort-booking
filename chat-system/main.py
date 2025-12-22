from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import subprocess, re
from mcp.client import ClientSession
from dashboard import chat_manager

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    session_id: str
    message: str

# ---------------- MCP Lazy Init ----------------
mcp_process = None
mcp = None

async def get_mcp():
    global mcp_process, mcp
    if mcp is None:
        mcp_process = subprocess.Popen(
            ["vizag-mcp-server"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE
        )
        mcp = ClientSession(
            stdin=mcp_process.stdin,
            stdout=mcp_process.stdout
        )
    return mcp

# ---------------- Chat API ----------------
@app.post("/api/chat")
async def chat(req: ChatRequest):
    text = req.message.lower()
    mcp = await get_mcp()

    booking_id = re.search(r"\d{3,10}", text)
    booking_id = booking_id.group() if booking_id else None

    if "refund" in text:
        return {
            "answer": await mcp.call_tool("get_refund_policy"),
            "handover": False
        }

    if "booking summary" in text and booking_id:
        return {
            "answer": await mcp.call_tool(
                "get_full_booking_summary",
                booking_id=booking_id
            ),
            "handover": False
        }

    await chat_manager.add_chat(req.session_id, req.message)
    return {"answer": "Connecting to human support…", "handover": True}
