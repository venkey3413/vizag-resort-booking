import uvicorn
from fastapi import FastAPI

from main import app as mcp_app
from dashboard import dashboard_app

app = FastAPI()

# MCP chat API
app.mount("/", mcp_app)

# Human dashboard
app.mount("/dashboard", dashboard_app)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
