import uvicorn
from main import app
from dashboard import dashboard_app
import asyncio
import subprocess
import os

async def start_mcp_server():
    """Start MCP server in background"""
    try:
        mcp_process = subprocess.Popen(
            ["python", "mcp_server/server.py"],
            cwd="/app"
        )
        print(f"🤖 MCP Server started with PID: {mcp_process.pid}")
    except Exception as e:
        print(f"❌ Failed to start MCP server: {e}")

async def run_servers():
    # Start MCP server first
    await start_mcp_server()
    
    # Run chat API on port 8000
    chat_config = uvicorn.Config(app, host="0.0.0.0", port=8000)
    chat_server = uvicorn.Server(chat_config)
    
    # Run dashboard on port 8001
    dashboard_config = uvicorn.Config(dashboard_app, host="0.0.0.0", port=8001)
    dashboard_server = uvicorn.Server(dashboard_config)
    
    # Run both servers concurrently
    await asyncio.gather(
        chat_server.serve(),
        dashboard_server.serve()
    )

if __name__ == "__main__":
    asyncio.run(run_servers())