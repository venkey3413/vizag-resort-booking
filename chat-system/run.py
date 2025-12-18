import uvicorn
from main import app
from dashboard import dashboard_app
import asyncio

async def run_servers():
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