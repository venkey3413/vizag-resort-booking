import uvicorn
from fastapi import FastAPI

from main import app as mcp_app
from dashboard import dashboard_app

app = FastAPI()

# MCP Chat API → /api/chat
app.mount("/api", mcp_app)

# Human Agent Dashboard
app.mount("/dashboard", dashboard_app)
app.mount("/agent", dashboard_app)  # optional alias

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
